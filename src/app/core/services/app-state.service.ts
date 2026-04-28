import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppStateService {

  private static readonly JOB_ID_KEY = 'jobId';
  private static readonly PROCESSING_COMPLETED_KEY = 'processingCompleted';

  private processingCompleted = new BehaviorSubject<boolean>(
    localStorage.getItem(AppStateService.PROCESSING_COMPLETED_KEY) === 'true'
  );

  processingCompleted$ = this.processingCompleted.asObservable();

  setCompleted(value: boolean) {
    this.processingCompleted.next(value);
    localStorage.setItem(AppStateService.PROCESSING_COMPLETED_KEY, String(value));
  }

  getCompleted() {
    return this.processingCompleted.value;
  }

  setJobId(jobId: string) {
    localStorage.setItem(AppStateService.JOB_ID_KEY, jobId);
  }

  getJobId() {
    return localStorage.getItem(AppStateService.JOB_ID_KEY) || '';
  }

  clearJobState() {
    localStorage.removeItem(AppStateService.JOB_ID_KEY);
    localStorage.removeItem(AppStateService.PROCESSING_COMPLETED_KEY);
    this.processingCompleted.next(false);
  }
}
