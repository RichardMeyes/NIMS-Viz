import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AblationPlaygroundComponent } from './ablation-playground.component';

describe('AblationPlaygroundComponent', () => {
  let component: AblationPlaygroundComponent;
  let fixture: ComponentFixture<AblationPlaygroundComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AblationPlaygroundComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AblationPlaygroundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
