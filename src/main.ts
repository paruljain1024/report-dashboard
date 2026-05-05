import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';

// ✅ FIXED import
import * as AOS from 'aos';

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    AOS.init({
      duration: 800,
      once: true
    });
  })
  .catch((err) => console.error(err));