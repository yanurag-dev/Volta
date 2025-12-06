"""
Celery tasks for CSV processing.
"""

import csv
import os
import logging
from celery import shared_task
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from volta.db.models import Product, UploadTask
from volta.bg_tasks.webhook_tasks import send_webhook_task

logger = logging.getLogger(__name__)


@shared_task(bind=True)
def process_csv_upload_task(self, task_id, file_path):
    """
    Process CSV file and import products.

    Args:
        task_id: UUID of the UploadTask
        file_path: Path to the uploaded CSV file

    Processes CSV in chunks for memory efficiency and tracks progress.
    """
    import time
    task_start_time = time.time()

    try:
        # Get upload task
        upload_task = UploadTask.objects.get(task_id=task_id)

        upload_task.status = 'processing'
        upload_task.started_at = timezone.now()
        upload_task.save()

        logger.info(f"Starting CSV import for task {task_id}")

        # Count total rows using different methods to verify
        with open(file_path, 'rb') as f:
            binary_lines = list(f)
            total_rows = len(binary_lines) - 1  # Exclude header

        logger.info(f"Total rows counted (binary): {total_rows}")
        logger.info(f"File size: {os.path.getsize(file_path)} bytes")
        logger.info(f"First line (binary): {binary_lines[0][:100] if binary_lines else 'No lines'}")
        logger.info(f"Last line (binary): {binary_lines[-1][:100] if binary_lines else 'No lines'}")

        # Verify with text mode
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            text_lines = list(f)
            text_rows = len(text_lines) - 1

        logger.info(f"Total rows counted (text): {text_rows}")
        logger.info(f"Last line (text): {text_lines[-1][:100] if text_lines else 'No lines'}")

        # Validate file is not empty
        if total_rows < 0:
            error_msg = "CSV file is empty or missing header row"
            raise ValueError(error_msg)

        upload_task.total_rows = total_rows
        upload_task.save()

        # Handle empty CSV (only header, no data rows)
        if total_rows == 0:
            upload_task.status = 'failed'
            upload_task.processed_rows = 0
            upload_task.successful_rows = 0
            upload_task.failed_rows = 0
            upload_task.completed_at = timezone.now()
            upload_task.error_message = "CSV file contains no data rows to import"
            upload_task.save()

            # Clean up file
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except OSError:
                    pass

            # Trigger webhook
            send_webhook_task.delay(
                webhook_id=None,
                event='upload.failed',
                payload={
                    'task_id': str(task_id),
                    'filename': upload_task.filename,
                    'error': 'CSV file contains no data rows to import'
                }
            )

            return {
                'status': 'failed',
                'error': 'CSV file contains no data rows to import'
            }

        # Process CSV in chunks
        CHUNK_SIZE = 5000  # Larger chunks for better bulk operation performance
        processed = 0
        successful = 0
        failed = 0
        errors = []

        try:
            with open(file_path, 'r', encoding='utf-8', errors='replace') as csvfile:
                reader = csv.DictReader(csvfile, skipinitialspace=True)

                # Validate headers
                required_fields = ['sku', 'name']
                if not reader.fieldnames or not all(field in reader.fieldnames for field in required_fields):
                    error_msg = f"CSV must contain fields: {', '.join(required_fields)}. Found: {reader.fieldnames}"
                    raise ValueError(error_msg)

                chunk = []
                rows_read = 0
                last_row_num = 0

                # Process all rows
                try:
                    for row_num, row in enumerate(reader, start=1):
                        try:
                            last_row_num = row_num
                            rows_read += 1

                            # Skip empty rows or rows with missing required fields
                            if not row.get('sku') or not row.get('name'):
                                logger.warning(f"Skipping row {row_num}: missing SKU or name")
                                failed += 1
                                continue

                            # Prepare product data
                            product_data = {
                                'sku': row['sku'].strip(),
                                'name': row['name'].strip(),
                                'description': row.get('description', '').strip(),
                                'active': True
                            }

                            chunk.append(product_data)

                            # Process chunk when full
                            if len(chunk) >= CHUNK_SIZE:
                                success_count, chunk_errors = _process_chunk(chunk)
                                successful += success_count
                                failed += len(chunk) - success_count
                                processed += len(chunk)
                                errors.extend(chunk_errors)

                                # Update progress
                                _update_progress(task_id, processed, total_rows, upload_task)

                                chunk = []

                        except csv.Error as e:
                            logger.error(f"CSV parsing error at row {row_num}: {str(e)}")
                            failed += 1
                            error_msg = f"Row {row_num}: CSV parsing error - {str(e)}"
                            if len(errors) < 100:
                                errors.append(error_msg)
                            # Continue to next row
                            continue
                        except Exception as e:
                            failed += 1
                            error_msg = f"Row {row_num}: {str(e)}"
                            # Only store first 100 errors to avoid memory issues
                            if len(errors) < 100:
                                errors.append(error_msg)
                            logger.error(f"Error processing row {row_num}: {str(e)}")

                except StopIteration as e:
                    logger.error(f"CSV reader stopped unexpectedly at row {last_row_num}: {str(e)}")
                    errors.append(f"CSV reading stopped unexpectedly at row {last_row_num}")
                except Exception as e:
                    logger.error(f"Fatal error during CSV iteration at row {last_row_num}: {str(e)}")
                    raise

                logger.info(f"CSV reading completed. Rows read: {rows_read}, Last row number: {last_row_num}, Total rows expected: {total_rows}")

                # Process remaining chunk
                if chunk:
                    success_count, chunk_errors = _process_chunk(chunk)
                    successful += success_count
                    failed += len(chunk) - success_count
                    processed += len(chunk)
                    errors.extend(chunk_errors)
                    _update_progress(task_id, processed, total_rows, upload_task)

        except csv.Error as e:
            logger.error(f"Fatal CSV parsing error: {str(e)}")
            raise ValueError(f"CSV file is malformed: {str(e)}")

        # Update final status
        upload_task.refresh_from_db()
        upload_task.status = 'completed'
        upload_task.processed_rows = processed
        upload_task.successful_rows = successful
        upload_task.failed_rows = failed
        upload_task.completed_at = timezone.now()

        if errors:
            error_summary = '\n'.join(errors[:100])
            if len(errors) > 100:
                error_summary += f"\n... and {len(errors) - 100} more errors"
            upload_task.error_message = error_summary

        upload_task.save()

        # Clean up file
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass

        # Trigger webhook
        send_webhook_task.delay(
            webhook_id=None,
            event='upload.completed',
            payload={
                'task_id': str(task_id),
                'filename': upload_task.filename,
                'total_rows': total_rows,
                'successful_rows': successful,
                'failed_rows': failed
            }
        )

        # Log total execution time
        total_elapsed = time.time() - task_start_time
        logger.info(f"✓ CSV import completed for task {task_id}")
        logger.info(f"  Total products: {total_rows:,}")
        logger.info(f"  Successful: {successful:,}")
        logger.info(f"  Failed: {failed:,}")
        logger.info(f"  Total time: {total_elapsed:.2f}s ({total_elapsed / 60:.2f} minutes)")
        logger.info(f"  Throughput: {int(successful / total_elapsed):,} products/second")

        return {
            'status': 'completed',
            'processed': processed,
            'successful': successful,
            'failed': failed,
            'elapsed_seconds': round(total_elapsed, 2)
        }

    except Exception as e:
        # Handle errors
        try:
            upload_task = UploadTask.objects.get(task_id=task_id)
            upload_task.status = 'failed'
            upload_task.error_message = str(e)
            upload_task.completed_at = timezone.now()
            upload_task.save()
        except Exception:
            pass

        # Clean up file
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass

        # Trigger webhook
        try:
            upload_task = UploadTask.objects.get(task_id=task_id)
            send_webhook_task.delay(
                webhook_id=None,
                event='upload.failed',
                payload={
                    'task_id': str(task_id),
                    'filename': upload_task.filename,
                    'error': str(e)
                }
            )
        except Exception:
            pass

        raise


def _process_chunk(chunk):
    """
    Process a chunk of products with true bulk operations.

    Returns tuple of (success_count, errors_list).
    """
    import time
    chunk_start = time.time()

    success_count = 0
    errors = []

    # Process all products in a single transaction
    with transaction.atomic():
        # Extract lowercase SKUs from chunk for efficient bulk lookup
        lookup_start = time.time()
        skus_lower = [p['sku'].lower() for p in chunk]

        # Get existing products using the sku_lower_idx index for fast lookup
        # Use annotate + filter to leverage the database index
        from django.db.models.functions import Lower

        existing_products = {
            p.sku.lower(): p
            for p in Product.objects.annotate(
                sku_lower=Lower('sku')
            ).filter(
                sku_lower__in=skus_lower
            ).only('id', 'sku', 'name', 'description', 'active')  # Fetch only needed fields
        }
        lookup_time = time.time() - lookup_start
        logger.info(f"DB lookup for {len(chunk)} products: {lookup_time:.3f}s | Found {len(existing_products)} existing")

        prep_start = time.time()
        # Use dictionaries to automatically handle duplicates within chunk (last occurrence wins)
        products_to_create_dict = {}
        products_to_update_dict = {}

        for product_data in chunk:
            try:
                sku_lower = product_data['sku'].lower()

                if sku_lower in existing_products:
                    # Update existing product (dict automatically handles duplicates)
                    product = existing_products[sku_lower]
                    product.name = product_data['name']
                    product.description = product_data['description']
                    product.active = product_data['active']
                    products_to_update_dict[sku_lower] = product
                else:
                    # Create new product (dict automatically handles duplicates)
                    products_to_create_dict[sku_lower] = Product(**product_data)

                success_count += 1

            except Exception as e:
                error_msg = f"SKU '{product_data.get('sku', 'unknown')}': {str(e)}"
                errors.append(error_msg)
                logger.error(f"Failed to process product: {error_msg}")
                continue

        # Convert dicts to lists for bulk operations
        products_to_create = list(products_to_create_dict.values())
        products_to_update = list(products_to_update_dict.values())

        prep_time = time.time() - prep_start

        # Bulk create new products
        create_time = 0
        if products_to_create:
            create_start = time.time()
            try:
                # No ignore_conflicts needed since we already filtered duplicates above
                Product.objects.bulk_create(products_to_create, batch_size=5000)
                create_time = time.time() - create_start
            except Exception as e:
                logger.error(f"Bulk create failed: {str(e)}")
                errors.append(f"Bulk create error: {str(e)}")

        # Bulk update existing products
        update_time = 0
        if products_to_update:
            update_start = time.time()
            try:
                Product.objects.bulk_update(
                    products_to_update,
                    ['name', 'description', 'active', 'updated_at'],
                    batch_size=1000
                )
                update_time = time.time() - update_start
            except Exception as e:
                logger.error(f"Bulk update failed: {str(e)}")
                errors.append(f"Bulk update error: {str(e)}")

        total_time = time.time() - chunk_start
        logger.info(f"Chunk timing: lookup={lookup_time:.3f}s, prep={prep_time:.3f}s, create={create_time:.3f}s, update={update_time:.3f}s, total={total_time:.3f}s")

    return success_count, errors


def _update_progress(task_id, current, total, upload_task):
    """Update progress in both database and cache."""
    # Update database
    upload_task.processed_rows = current
    upload_task.save(update_fields=['processed_rows'])

    # Update cache for SSE streaming
    progress_data = {
        'current': current,
        'total': total,
        'percentage': round((current / total) * 100, 2) if total > 0 else 0,
        'status': 'processing'
    }
    cache.set(f"upload:{task_id}:progress", progress_data, timeout=3600)
