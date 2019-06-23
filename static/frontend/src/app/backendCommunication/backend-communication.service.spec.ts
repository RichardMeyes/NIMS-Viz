import { TestBed } from '@angular/core/testing';

import { BackendCommunicationService } from './backend-communication.service';

describe('BackendCommunicationService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: BackendCommunicationService = TestBed.get(BackendCommunicationService);
    expect(service).toBeTruthy();
  });
});
