import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AblationMappingComponent } from './ablation-mapping.component';

describe('AblationMappingComponent', () => {
  let component: AblationMappingComponent;
  let fixture: ComponentFixture<AblationMappingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AblationMappingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AblationMappingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
