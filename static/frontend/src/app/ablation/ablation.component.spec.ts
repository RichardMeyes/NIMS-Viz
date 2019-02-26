import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AblationComponent } from './ablation.component';

describe('AblationComponent', () => {
  let component: AblationComponent;
  let fixture: ComponentFixture<AblationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AblationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AblationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
