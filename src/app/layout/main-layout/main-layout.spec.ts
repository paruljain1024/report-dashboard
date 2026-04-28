import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { MainLayoutComponent } from './main-layout';
import { ApiService } from '../../core/services/api.service';
import { AppStateService } from '../../core/services/app-state.service';

describe('MainLayout', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        AppStateService,
        {
          provide: ApiService,
          useValue: {
            getProcessingStatus: () => of({ status: 'PENDING' })
          }
        }
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
