import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { timer, Subscription } from 'rxjs';
import { AppStateService } from '../../core/services/app-state.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector:'app-processing',
  standalone:true,
  imports:[CommonModule,FormsModule],
  templateUrl:'./processing.html',
  styleUrl:'./processing.css'
})
export class ProcessingComponent implements OnInit, OnDestroy {

  currentUser: string = '';
  userConfirmed: boolean = false;

  speed:number = 0;
  progress:number = 0;

  processing = false;
  completed = false;

  errorMessage: string = '';
  showError: boolean = false;

  successMessage: string = '';
  showSuccess: boolean = false;

  pollSub?: Subscription;

  constructor(
    private api:ApiService,
    private cd:ChangeDetectorRef,
    private state:AppStateService
  ){}

  ngOnInit(){
    if(this.state.getCompleted()){
      this.completed = true;
      this.processing = false;
    }
  }

  ngOnDestroy(){
    this.pollSub?.unsubscribe();
  }

  confirmUser() {
    if (!this.currentUser.trim()) return;

    localStorage.setItem(
      'currentUser',
      this.currentUser.toLowerCase()
    );

    this.userConfirmed = true;
  }

  // ✅ START PROCESS
  startProcessing(){

    // reset state
    this.errorMessage = '';
    this.showError = false;
    this.showSuccess = false;

    this.progress = 0;
    this.speed = 0;

    this.processing = false;
    this.completed = false;
    this.state.setCompleted(false);

    this.pollSub?.unsubscribe();

    this.api.checkLogs().subscribe({
      next: (res:any) => {

        if(!res.hasLogs){
          this.showErrorPopup("No log files found");
          return;
        }

        this.api.startProcessing().subscribe({
          next: (startRes:any) => {

            console.log("START RESPONSE:", startRes);

            if(!startRes.started){
              this.showErrorPopup(startRes.message || "Failed to start");
              return;
            }

            // ✅ start UI only after success
            this.processing = true;
            this.completed = false;

            this.startPolling();
          },

          error: () => {
            this.processing = false;
            this.showErrorPopup("Backend not reachable");
            this.cd.detectChanges();   
          }
        });
      },

      error: () => {
        this.processing = false;
        this.completed = false;
        this.showErrorPopup("Backend not reachable");
        this.cd.detectChanges();   
      }
    });
  }

  // ✅ POLLING METHOD
  startPolling(){

    this.pollSub?.unsubscribe();

    this.pollSub = timer(0,2000)
      .subscribe(() => this.checkStatus());
  }

  // ✅ STATUS CHECK
  checkStatus(){

    this.api.getProcessingStatus()
      .subscribe((res:any) => {

        console.log("STATUS:", res);

        // 🔴 FAILED
        if(res.status === 'FAILED'){

          this.processing = false;
          this.completed = false;
          this.state.setCompleted(false);

          this.pollSub?.unsubscribe();

          this.showErrorPopup(res.message || 'Processing failed');
          return;
        }

        // 🟢 COMPLETED
        if(res.status === 'COMPLETED'){

          this.processing = false;
          this.completed = true;
          this.progress = 100;

          this.pollSub?.unsubscribe();

          this.state.setCompleted(true);

          this.successMessage = 'Logs processed successfully!';
          this.showSuccess = true;

          setTimeout(() => {
            this.showSuccess = false;
          }, 3000);

          this.cd.detectChanges();
          return;
        }

        // 🔵 NORMAL PROCESSING
        this.processing = true;
        this.completed = false;

        this.progress = res.progress ?? 0;
        this.speed = res.speed ?? 0;

        this.cd.detectChanges();

      },
      () => {
        this.processing = false;
        this.completed = false;
        this.state.setCompleted(false);
        this.pollSub?.unsubscribe();
        this.showErrorPopup('Backend not reachable');
      });
  }

  // ✅ ERROR POPUP
  showErrorPopup(message:string){
  this.errorMessage = message;
  this.showError = true;

  this.cd.detectChanges();   // 🔥 FORCE UI UPDATE

  setTimeout(() => {
    this.showError = false;
    this.cd.detectChanges(); // 🔥 update again after hide
  }, 3000);
}
}