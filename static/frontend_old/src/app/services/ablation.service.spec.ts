import { TestBed, inject } from '@angular/core/testing';

import { AblationService } from './ablation.service';

describe('AblationService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AblationService]
    });
  });

  it('should be created', inject([AblationService], (service: AblationService) => {
    expect(service).toBeTruthy();
  }));
});
