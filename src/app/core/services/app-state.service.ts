import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppStateService {

  // 🔥 USER SESSION
  private currentUser = new BehaviorSubject<string>(
    sessionStorage.getItem('currentUser') || ''
  );

  currentUser$ = this.currentUser.asObservable();

  setUser(name:string){
    sessionStorage.setItem('currentUser', name);
    this.currentUser.next(name);
  }

  getUser(){
    return this.currentUser.value;
  }

  isUserEntered(){
    return !!this.currentUser.value;
  }

  clearUser(){
    sessionStorage.removeItem('currentUser');
    this.currentUser.next('');
  }

  // 🔥 PROCESSING COMPLETED
  private static readonly PROCESSING_COMPLETED_KEY = 'processingCompleted';

  private processingCompleted = new BehaviorSubject<boolean>(
    localStorage.getItem(AppStateService.PROCESSING_COMPLETED_KEY) === 'true'
  );

  processingCompleted$ = this.processingCompleted.asObservable();

  setCompleted(value: boolean) {
    this.processingCompleted.next(value);
    localStorage.setItem(
      AppStateService.PROCESSING_COMPLETED_KEY,
      String(value)
    );
  }

  getCompleted() {
    return this.processingCompleted.value;
  }

  clearProcessingState() {
    localStorage.removeItem(
      AppStateService.PROCESSING_COMPLETED_KEY
    );

    this.processingCompleted.next(false);
  }

  // 🔥 HAS DATA
  private hasData = new BehaviorSubject<boolean>(
    localStorage.getItem('hasData') === 'true'
  );

  hasData$ = this.hasData.asObservable();

  setHasData(value: boolean){

    this.hasData.next(value);

    localStorage.setItem('hasData', String(value));
  }

  getHasData(){
    return this.hasData.value;
  }
}