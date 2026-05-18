import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { timer, Subscription } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { AppStateService } from '../../core/services/app-state.service';
import { NotificationService } from '../../core/services/notification.services';

@Component({
  selector:'app-processing',
  standalone:true,
  imports:[CommonModule, FormsModule],
  templateUrl:'./processing.html',
  styleUrl:'./processing.css'
})
export class ProcessingComponent
implements OnInit, OnDestroy {

  hasData = false;

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

  // 🔥 NEW
  processedGB = 0;
  totalGB = 0;
  etaSeconds = 0;

  pollSub?: Subscription;

  constructor(
    private api:ApiService,
    private cd:ChangeDetectorRef,
    private state:AppStateService,
    private notify: NotificationService
  ){}

  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(){

    const savedUser = this.state.getUser();

    if(savedUser){

      this.currentUser = savedUser;
      this.userConfirmed = true;

      this.api.getProcessingStatus()
      .subscribe((res:any) => {

        console.log("INIT STATUS:", res);

        if(res.startTime){
          this.startTime =
            new Date(res.startTime).toLocaleString();
        }

        if(res.endTime){
          this.endTime =
            new Date(res.endTime).toLocaleString();
        }

        // 🔥 NEW
        this.processedGB =
          res.processedGB ?? 0;

        this.totalGB =
          res.totalGB ?? 0;

        this.etaSeconds =
          res.etaSeconds ?? 0;

        // 🔵 PROCESSING
        if(res.status === 'PROCESSING'){

          this.processing = true;
          this.completed = false;

          this.progress = res.progress ?? 0;
          this.speed = res.speed ?? 0;

          if(this.state.getHasData()){
            this.hasData = true;
          }

          this.startPolling();
        }

        // 🟢 COMPLETED
        else if(res.status === 'COMPLETED'){

          this.processing = false;
          this.completed = true;

          this.progress = 100;
          this.speed = res.speed ?? 0;

          this.hasData = true;

          this.state.setCompleted(true);
          this.state.setHasData(true);
        }

        // 🔴 NOT STARTED
        else {

          this.processing = false;
          this.completed = false;

          this.hasData =
            this.state.getHasData();
        }

        this.cd.detectChanges();
      });
    }
  }

  ngOnDestroy(){
    this.pollSub?.unsubscribe();
  }

  // =========================================================
  // USER CONFIRM
  // =========================================================

  confirmUser() {

    if (!this.currentUser.trim()) return;

    this.userConfirmed = true;

    this.state.setUser(
      this.currentUser.toLowerCase()
    );

    this.ngOnInit();
  }

  // =========================================================
  // START PROCESS
  // =========================================================

  startProcessing(){

    this.errorMessage = '';
    this.showError = false;
    this.showSuccess = false;

    this.progress = 0;
    this.speed = 0;

    // 🔥 NEW
    this.processedGB = 0;
    this.totalGB = 0;
    this.etaSeconds = 0;

    this.processing = false;

    if(!this.hasData){
      this.completed = false;
      this.state.setCompleted(false);
    }

    this.pollSub?.unsubscribe();

    this.api.checkLogs().subscribe({

      next: (res:any) => {

        if(!res.hasLogs){

          this.showErrorPopup(
            "No log files found"
          );

          return;
        }

        this.api.startProcessing().subscribe({

          next: (startRes:any) => {

            console.log(
              "START RESPONSE:",
              startRes
            );

            if(!startRes.started){

              if(
                startRes.message ===
                "Processing already running"
              ){

                this.processing = true;
                this.completed = false;

                this.startPolling();

                return;
              }

              this.showErrorPopup(
                startRes.message || "Failed to start"
              );

              return;
            }

            this.processing = true;
            this.completed = false;

            this.hasData = true;
            this.state.setHasData(true);

            this.startPolling();
          },

          error: () => {

            this.processing = false;

            this.showErrorPopup(
              "Backend not reachable"
            );

            this.cd.detectChanges();
          }
        });
      },

      error: () => {

        this.processing = false;
        this.completed = false;

        this.showErrorPopup(
          "Backend not reachable"
        );

        this.cd.detectChanges();
      }
    });
  }

  // =========================================================
  // POLLING
  // =========================================================

  startPolling(){

    this.pollSub?.unsubscribe();

    this.pollSub = timer(0,5000)
      .subscribe(() => this.checkStatus());
  }

  // =========================================================
  // STATUS CHECK
  // =========================================================

  checkStatus(){

    this.api.getProcessingStatus()
      .subscribe((res:any) => {

        const prev = this.previousStatus;

        this.previousStatus = res.status;

        console.log("STATUS:", res);

        if(res.startTime){
          this.startTime =
            new Date(res.startTime).toLocaleString();
        }

        if(res.endTime){
          this.endTime =
            new Date(res.endTime).toLocaleString();
        }

        // 🔥 NEW
        this.processedGB =
          res.processedGB ?? 0;

        this.totalGB =
          res.totalGB ?? 0;

        this.etaSeconds =
          res.etaSeconds ?? 0;

        // 🔴 FAILED
        if(res.status === 'FAILED'){

          this.processing = false;
          this.completed = false;

          this.hasData =
            this.state.getHasData();

          this.state.setCompleted(false);

          this.pollSub?.unsubscribe();

          this.showErrorPopup(
            res.message || 'Processing failed'
          );

          return;
        }

        // 🟢 COMPLETED
        if(res.status === 'COMPLETED'){

          this.processing = false;

          this.completed = true;

          this.progress = 100;

          this.speed = res.speed ?? 0;

          this.hasData = true;

          this.pollSub?.unsubscribe();

          this.state.setCompleted(true);
          this.state.setHasData(true);

          if(prev !== 'COMPLETED'){

            this.notify.show(
              'New data has been loaded'
            );

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

          if(!this.hasData){
            this.completed = false;
          }

          this.progress = res.progress ?? 0;

          this.speed = res.speed ?? 0;

          this.cd.detectChanges();

          return;
        }
      },
      () => {

        this.processing = false;
        this.completed = false;

        this.hasData =
          this.state.getHasData();

        this.state.setCompleted(false);

        this.pollSub?.unsubscribe();

        this.showErrorPopup(
          'Backend not reachable'
        );
      });
  }

  // =========================================================
  // ETA FORMAT
  // =========================================================

  formatETA(seconds:number):string {

    if(!seconds || seconds <= 0){
      return 'Calculating...';
    }

    const mins =
      Math.floor(seconds / 60);

    const hrs =
      Math.floor(mins / 60);

    if(hrs > 0){
      return `${hrs}h ${mins % 60}m`;
    }

    return `${mins} mins`;
  }

  // =========================================================
  // ERROR POPUP
  // =========================================================

  showErrorPopup(message:string){

    this.errorMessage = message;
    this.showError = true;

    this.cd.detectChanges();

    setTimeout(() => {

      this.showError = false;

      this.cd.detectChanges();

    }, 3000);
  }

  // =========================================================
  // REPROCESS
  // =========================================================

  reprocessLogs(){

    this.processing = true;

    this.progress = 0;
    this.speed = 0;

    // 🔥 NEW
    this.processedGB = 0;
    this.totalGB = 0;
    this.etaSeconds = 0;

    this.startProcessing();
  }
}