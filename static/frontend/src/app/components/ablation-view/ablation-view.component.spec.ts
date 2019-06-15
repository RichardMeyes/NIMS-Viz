import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AblationViewComponent } from './ablation-view.component';

describe('AblationViewComponent', () => {
  let component: AblationViewComponent;
  let fixture: ComponentFixture<AblationViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AblationViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AblationViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
