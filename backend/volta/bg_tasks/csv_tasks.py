"""
Celery tasks for CSV processing.
"""

import csv
import os
from celery import shared_task
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from volta.db.models import Product, UploadTask
from volta.bg_tasks.webhook_tasks import send_webhook_task


@shared_task(bind=True)
def process_csv_upload_task(self, task_id, file_path):
    """
    Process CSV file and import products.

    Args:
        task_id: UUID of the UploadTask
        file_path: Path to the uploaded CSV file

    Processes CSV in chunks for memory efficiency and tracks progress.
    """
    try:
        # Get upload task
        upload_task = UploadTask.objects.get(task_id=task_id)

        upload_task.status = 'processing'
        upload_task.started_at = timezone.now()
        upload_task.save()

        # Count total rows
        with open(file_path, 'r', encoding='utf-8') as f:
            total_rows = sum(1 for _ in f) - 1  # Exclude header

        # Validate file is not empty
        if total_rows < 0:
            error_msg = "CSV file is empty or contains no data rows"
            raise ValueError(error_msg)

        upload_task.total_rows = total_rows
        upload_task.save()

        # Handle empty CSV (only header, no data rows)
        if total_rows == 0:
            upload_task.status = 'completed'
            upload_task.processed_rows = 0
            upload_task.successful_rows = 0
            upload_task.failed_rows = 0
            upload_task.completed_at = timezone.now()
            upload_task.error_message = "CSV file contains headers but no data rows"
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
                    'total_rows': 0,
                    'successful_rows': 0,
                    'failed_rows': 0,
                    'warning': 'No data rows to process'
                }
            )

            return {
                'status': 'completed',
                'processed': 0,
                'successful': 0,
                'failed': 0,
                'warning': 'CSV file contains no data rows'
            }

        # Process CSV in chunks
        CHUNK_SIZE = 5000
        processed = 0
        successful = 0
        failed = 0
        errors = []

        with open(file_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)

            # Read first row to initialize fieldnames
            first_row = None
            try:
                first_row = next(reader)
            except StopIteration:
                error_msg = "CSV file is empty or contains no data rows"
                raise ValueError(error_msg)

            # Validate headers
            required_fields = ['sku', 'name']
            if not reader.fieldnames or not all(field in reader.fieldnames for field in required_fields):
                error_msg = f"CSV must contain fields: {', '.join(required_fields)}. Found: {reader.fieldnames}"
                raise ValueError(error_msg)

            chunk = []

            # Process the first row we already read
            if first_row:
                try:
                    product_data = {
                        'sku': first_row['sku'].strip(),
                        'name': first_row['name'].strip(),
                        'description': first_row.get('description', '').strip(),
                        'active': True
                    }
                    chunk.append(product_data)
                except Exception as e:
                    failed += 1
                    error_msg = f"Row 1: {str(e)}"
                    errors.append(error_msg)

            # Process remaining rows
            for row_num, row in enumerate(reader, start=2):
                try:
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
                        success_count = _process_chunk(chunk)
                        successful += success_count
                        failed += len(chunk) - success_count
                        processed += len(chunk)

                        # Update progress
                        _update_progress(task_id, processed, total_rows, upload_task)

                        chunk = []

                except Exception as e:
                    failed += 1
                    error_msg = f"Row {row_num}: {str(e)}"
                    errors.append(error_msg)
                    if len(errors) > 100:  # Limit error messages
                        errors.append("... (more errors)")
                        break

            # Process remaining chunk
            if chunk:
                success_count = _process_chunk(chunk)
                successful += success_count
                failed += len(chunk) - success_count
                processed += len(chunk)
                _update_progress(task_id, processed, total_rows, upload_task)

        # Update final status
        upload_task.refresh_from_db()
        upload_task.status = 'completed'
        upload_task.processed_rows = processed
        upload_task.successful_rows = successful
        upload_task.failed_rows = failed
        upload_task.completed_at = timezone.now()

        if errors:
            upload_task.error_message = '\n'.join(errors[:100])

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

        return {
            'status': 'completed',
            'processed': processed,
            'successful': successful,
            'failed': failed
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
    Process a chunk of products with bulk operations.

    Returns number of successfully processed products.
    """
    success_count = 0

    with transaction.atomic():
        for product_data in chunk:
            try:
                # Update or create product (case-insensitive SKU)
                product, created = Product.objects.update_or_create(
                    sku__iexact=product_data['sku'],
                    defaults=product_data
                )
                success_count += 1

                # Trigger webhook for individual product
                event = 'product.created' if created else 'product.updated'
                send_webhook_task.delay(
                    webhook_id=None,
                    event=event,
                    payload={
                        'product_id': product.id,
                        'sku': product.sku,
                        'name': product.name
                    }
                )

            except Exception:
                # Continue processing other products
                continue

    return success_count


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
