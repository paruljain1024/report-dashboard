import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
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

  clearProcessingState() {
    localStorage.removeItem(AppStateService.PROCESSING_COMPLETED_KEY);
    this.processingCompleted.next(false);
  }
  private hasData = new BehaviorSubject<boolean>(false);

  hasData$ = this.hasData.asObservable();

  setHasData(value: boolean){
    this.hasData.next(value);
  }

  getHasData(){
    return this.hasData.value;
  }
}
