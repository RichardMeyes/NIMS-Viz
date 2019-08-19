import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AblationFreeDrawingComponent } from './ablation-free-drawing.component';

describe('AblationFreeDrawingComponent', () => {
  let component: AblationFreeDrawingComponent;
  let fixture: ComponentFixture<AblationFreeDrawingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AblationFreeDrawingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AblationFreeDrawingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
