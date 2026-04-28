import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { SidebarComponent } from './sidebar';
import { ApiService } from '../../core/services/api.service';
import { AppStateService } from '../../core/services/app-state.service';

describe('Sidebar', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
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

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
