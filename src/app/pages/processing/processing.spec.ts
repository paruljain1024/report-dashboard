import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import {ProcessingComponent} from './processing';

describe('Processing', () => {
  let component: ProcessingComponent;
  let fixture: ComponentFixture<ProcessingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProcessingComponent],
      providers: [provideHttpClient()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProcessingComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
