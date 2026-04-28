import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { timer, Subscription } from 'rxjs';
import { AppStateService } from '../../core/services/app-state.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-processing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './processing.html',
  styleUrl: './processing.css'
})
export class ProcessingComponent implements OnInit, OnDestroy {

  currentUser: string = '';
  userConfirmed: boolean = false;

  speed = 0;
  progress = 0;

  processing = false;
  completed = false;
  hasStarted = false;

  statusText = 'NOT_STARTED';

  activeJobId = '';

  errorMessage = '';
  showError = false;
  hasError = false;   // ✅ FIX ADDED

  successMessage = '';
  showSuccess = false;

  pollSub?: Subscription;

  constructor(
    private api: ApiService,
    private cd: ChangeDetectorRef,
    private state: AppStateService
  ) {}

  ngOnInit() {}

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
  }

  confirmUser() {
    if (!this.currentUser.trim()) return;

    localStorage.setItem('currentUser', this.currentUser.toLowerCase());
    this.userConfirmed = true;
  }

  // ✅ START PROCESS
  startProcessing() {

  // reset
  this.errorMessage = '';
  this.showError = false;
  this.hasError = false;

  this.progress = 0;
  this.speed = 0;

  this.processing = true;
  this.completed = false;
  this.hasStarted = true;

  this.statusText = 'STARTING';

  this.pollSub?.unsubscribe();

  // STEP 1: check logs
  this.api.checkLogs().subscribe({
    next: (res) => {

      console.log('[processing] checkLogs', res);

      if (!res.hasLogs) {
        this.handleError('No log files found');
        return;
      }

      // STEP 2: start processing
      this.api.startProcessing().subscribe({
        next: (startRes) => {

          console.log('[processing] startProcessing', startRes);

          if (!startRes.started || !startRes.jobId) {
            this.handleError('Invalid start response');
            return;
          }

          // ✅ IMPORTANT
          this.activeJobId = startRes.jobId;

          console.log('🔥 JobId SET:', this.activeJobId);

          this.statusText = 'PROCESSING';

          // ✅ FORCE UI UPDATE
          this.cd.detectChanges();

          // ✅ START POLLING (CRITICAL)
          this.startPolling();
        },
        error: () => this.handleError('Failed to start processing')
      });

    },
    error: () => this.handleError('Backend not reachable')
  });
}

  // ✅ START POLLING
startPolling() {

  if (!this.activeJobId) {
    console.log('❌ No jobId → polling stopped');
    return;
  }

  console.log('✅ Polling started for:', this.activeJobId);

  this.pollSub = timer(0, 2000)
    .subscribe(() => this.checkStatus());
}

  // ✅ STATUS CHECK
  checkStatus() {

  if (!this.activeJobId) return;

  console.log('📡 Calling status API:', this.activeJobId);

  this.api.getProcessingStatus(this.activeJobId).subscribe({
    next: (res: any) => {

      console.log('✅ STATUS RESPONSE:', res);

      this.progress = res.progress ?? 0;
      this.speed = res.speed ?? 0;
      this.statusText = res.status ?? 'UNKNOWN';

      if (res.status === 'FAILED') {
        this.handleError(res.message || 'Processing failed');
        return;
      }

      if (res.status === 'COMPLETED') {
        this.processing = false;
        this.completed = true;
        this.progress = 100;

        this.pollSub?.unsubscribe();

        this.successMessage = 'Logs processed successfully!';
        this.showSuccess = true;

        setTimeout(() => this.showSuccess = false, 3000);
      }

      this.cd.detectChanges();
    },
    error: () => this.handleError('Status API failed')
  });
}
  // ✅ ERROR HANDLER
  handleError(msg: string) {
    this.processing = false;
    this.pollSub?.unsubscribe();
    this.showErrorPopup(msg);
  }

  // ✅ ERROR POPUP
  showErrorPopup(message: string) {
    this.errorMessage = message;
    this.showError = true;
    this.hasError = true;

    setTimeout(() => {
      this.showError = false;
    }, 3000);
  }
}