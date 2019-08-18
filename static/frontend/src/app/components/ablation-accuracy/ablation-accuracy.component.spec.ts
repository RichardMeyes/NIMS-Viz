import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AblationAccuracyComponent } from './ablation-accuracy.component';

describe('AblationAccuracyComponent', () => {
  let component: AblationAccuracyComponent;
  let fixture: ComponentFixture<AblationAccuracyComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AblationAccuracyComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AblationAccuracyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
