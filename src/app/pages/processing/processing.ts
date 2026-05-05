import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { timer, Subscription } from 'rxjs';
import { AppStateService } from '../../core/services/app-state.service';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../core/services/notification.services';
@Component({
  selector:'app-processing',
  standalone:true,
  imports:[CommonModule,FormsModule],
  templateUrl:'./processing.html',
  styleUrl:'./processing.css'
})
export class ProcessingComponent implements OnInit, OnDestroy {

  hasData = false;   // 🔥 NEW

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

  startTime: string = '';
  endTime: string = '';

  previousStatus: string = '';

  pollSub?: Subscription;

  constructor(
  private api:ApiService,
  private cd:ChangeDetectorRef,
  private state:AppStateService,
  private notify: NotificationService   // 🔥 ADD THIS
){}

ngOnInit(){

  this.api.getProcessingStatus().subscribe((res:any) => {

    console.log("INIT STATUS:", res);

    // 🔵 If already processing → resume polling
    if(res.status === 'PROCESSING'){
      this.processing = true;
      this.startPolling();
    }

    // 🟢 If completed → show result but DON'T poll
    else if(res.status === 'COMPLETED'){
      this.completed = true;
      this.progress = 100;
      this.state.setCompleted(true);
    }

    // 🔴 If not started → do NOTHING
    else {
      this.processing = false;
      this.completed = false;
    }

  });

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
    // DO NOT CLEAR completed if data exists
    if(!this.hasData){
      this.completed = false;
      this.state.setCompleted(false);
    }

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

              if(startRes.message === "Processing already running"){

              // 🔥 KEY FIX
              this.processing = true;
              this.completed = false;

              this.startPolling();
              return;
            }

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

    this.pollSub = timer(0,5000)
      .subscribe(() => this.checkStatus());
  }

  // ✅ STATUS CHECK
  checkStatus(){

    this.api.getProcessingStatus()
      .subscribe((res:any) => {

        const prev = this.previousStatus;   // 🔥 STORE OLD STATE
        this.previousStatus = res.status; 

        console.log("STATUS:", res);


        if(res.startTime){
        this.startTime = new Date(res.startTime).toLocaleString();
        }

        if(res.endTime){
        this.endTime = new Date(res.endTime).toLocaleString();
        }

        // 🔴 FAILED
        if(res.status === 'FAILED'){

          this.processing = false;
          this.completed = false;
          this.hasData = false;
          this.state.setCompleted(false);
          this.state.setHasData(false);

          this.pollSub?.unsubscribe();

          this.showErrorPopup(res.message || 'Processing failed');
          return;
        }

        // 🟢 COMPLETED
        if(res.status === 'COMPLETED'){

          this.processing = false;
          this.completed = true;
          this.progress = 100;
          this.hasData = true; 
           

          this.pollSub?.unsubscribe();

          this.state.setCompleted(true);
          this.state.setHasData(true);

          // 🔥 SHOW POPUP ONLY ON TRANSITION
          if(prev !== 'COMPLETED'){
          this.notify.show('New data has been loaded');

          setTimeout(() => {
          this.showSuccess = false;
          }, 3000);
          }

          this.previousStatus = 'COMPLETED';

          this.cd.detectChanges();
          return;
        }

         // 🔵 PROCESSING
        if(res.status === 'PROCESSING')
        {
          this.processing = true;
          this.completed = false;

          this.progress = res.progress ?? 0;
          this.speed = res.speed ?? 0;

          // 🔥 if data was already present, keep it usable
          if(this.completed){
            this.hasData = true;
          }

          this.cd.detectChanges();

          return;
        }
      },
      () => {
        this.processing = false;
        this.completed = false;
        this.hasData = false;
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
reprocessLogs(){

  // 🔥 do NOT clear UI completely
  this.processing = true;
  this.completed = false;

  this.progress = 0;
  this.speed = 0;

  this.startProcessing();
}
}