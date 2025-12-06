"""
Upload API views for CSV file processing.
"""

import os
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from django.core.cache import cache
from django.http import StreamingHttpResponse
from django.conf import settings
from django.db import transaction
import json
import time

from volta.db.models import UploadTask
from volta.api.serializers.upload_task import UploadTaskSerializer, UploadTaskListSerializer
from volta.bg_tasks.csv_tasks import process_csv_upload_task


@api_view(['POST'])
@parser_classes([MultiPartParser])
def upload_csv(request):
    """
    Upload a CSV file for processing.

    Accepts a CSV file and triggers asynchronous processing via Celery.
    Returns the task_id for progress tracking.
    """
    if 'file' not in request.FILES:
        return Response(
            {'error': 'No file provided. Please upload a CSV file.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    uploaded_file = request.FILES['file']

    # Validate file extension
    if not uploaded_file.name.endswith('.csv'):
        return Response(
            {'error': 'Invalid file type. Only CSV files are allowed.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate file is not empty
    if uploaded_file.size == 0:
        return Response(
            {'error': 'CSV file is empty. Please upload a file with data.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    upload_dir = os.path.join(settings.MEDIA_ROOT, 'uploads')
    os.makedirs(upload_dir, exist_ok=True)

    file_path = None
    upload_task = None

    try:
        # Wrap DB record creation and file write in atomic transaction
        with transaction.atomic():
            # Create upload task record inside transaction
            upload_task = UploadTask.objects.create(
                filename=uploaded_file.name,
                status='pending'
            )

            # Generate file path
            file_path = os.path.join(
                upload_dir,
                f"{upload_task.task_id}_{uploaded_file.name}"
            )

            # Save file to disk inside transaction
            try:
                with open(file_path, 'wb+') as destination:
                    for chunk in uploaded_file.chunks():
                        destination.write(chunk)
            except IOError:
                # Clean up partial file if it exists
                if file_path and os.path.exists(file_path):
                    os.remove(file_path)
                raise

            # Schedule Celery task only after transaction commits
            transaction.on_commit(
                lambda: process_csv_upload_task.delay(
                    str(upload_task.task_id),
                    file_path
                )
            )

        serializer = UploadTaskSerializer(upload_task)

        return Response({
            'message': 'File uploaded successfully. Processing started.',
            'task': serializer.data
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        # Clean up: remove file if it exists
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass

        # Transaction rollback will handle DB cleanup
        return Response({
            'error': f'Upload failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def upload_status(request, task_id):
    """
    Get the current status of an upload task.

    Returns detailed information about the upload progress.
    """
    try:
        upload_task = UploadTask.objects.get(task_id=task_id)
        serializer = UploadTaskSerializer(upload_task)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except UploadTask.DoesNotExist:
        return Response(
            {'error': 'Upload task not found.'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception:
        raise


def upload_progress_stream(request, task_id):
    """
    SSE endpoint for real-time upload progress updates.

    Streams progress updates to the client using Server-Sent Events.
    Note: This view doesn't use @api_view decorator to avoid DRF's content negotiation
    which would reject text/event-stream Accept headers with 406 Not Acceptable.
    """
    def event_stream():
        """Generator function for SSE."""
        # Check if task exists
        try:
            upload_task = UploadTask.objects.get(task_id=task_id)
        except UploadTask.DoesNotExist:
            yield f"data: {json.dumps({'error': 'Task not found'})}\n\n"
            return

        # Stream progress updates
        max_iterations = 600  # 10 minutes (600 seconds)
        iteration = 0

        while iteration < max_iterations:
            # Get latest task data
            upload_task.refresh_from_db()

            # Get progress from cache
            progress_key = f"upload:{task_id}:progress"
            progress_data = cache.get(progress_key)

            if not progress_data:
                progress_data = {
                    'current': upload_task.processed_rows,
                    'total': upload_task.total_rows,
                    'percentage': upload_task.progress_percentage,
                    'status': upload_task.status
                }

            # Send progress update
            yield f"data: {json.dumps(progress_data)}\n\n"

            # Break if upload is completed or failed
            if upload_task.status in ['completed', 'failed']:
                break

            # Wait before next update
            time.sleep(1)
            iteration += 1

        # Send final status
        final_data = {
            'status': upload_task.status,
            'message': 'Upload complete' if upload_task.status == 'completed' else 'Upload failed',
            'total_rows': upload_task.total_rows,
            'successful_rows': upload_task.successful_rows,
            'failed_rows': upload_task.failed_rows,
            'error_message': upload_task.error_message if upload_task.status == 'failed' else None
        }
        yield f"data: {json.dumps(final_data)}\n\n"

    response = StreamingHttpResponse(
        event_stream(),
        content_type='text/event-stream'
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response


@api_view(['GET'])
def upload_history(request):
    """
    Get list of recent upload tasks.

    Returns paginated list of upload tasks ordered by creation date.
    """
    try:
        tasks = UploadTask.objects.all().order_by('-created_at')[:50]
        serializer = UploadTaskListSerializer(tasks, many=True)

        count = tasks.count()

        return Response({
            'count': count,
            'results': serializer.data
        }, status=status.HTTP_200_OK)
    except Exception:
        raise
