import { Component, OnInit } from '@angular/core';
import { TrainingSettings, TrainingSettingsJSON } from '../../models/neural-network.model';
import { SavedNetworks } from 'src/app/models/saved-networks.model';

import { DataService } from 'src/app/services/data.service';
import { BackendCommunicationService } from '../../backendCommunication/backend-communication.service';
import { EventsService } from 'src/app/services/events.service';
import { EpochSlider } from 'src/app/models/layer-view.model';
import { LossFunctionMapping, LossFunction } from 'src/app/models/dropdown.model';


/**
 * Component for training a Network
 */
@Component({
  selector: 'app-training',
  templateUrl: './training.component.html',
  styleUrls: ['./training.component.scss']
})
export class TrainingComponent implements OnInit {

  public _trainingSettings: TrainingSettings;
  public _selectedNetwork: SavedNetworks;

  get lossFunctions() {
    return Object.values(LossFunction);
  }

  public LossFunctionMapping = LossFunctionMapping;


  constructor(
    private backend: BackendCommunicationService,
    private eventsService: EventsService,
    private dataService: DataService
  ) { }

  ngOnInit() {
    this._trainingSettings = this.dataService.trainingSettings;
    this._selectedNetwork = this.dataService.selectedNetwork;
  }

  trainNetwork() {
    const trainSetup: TrainingSettingsJSON = {
      batchSize: JSON.parse(JSON.stringify(this._trainingSettings.batchSize)),
      epochs: JSON.parse(JSON.stringify(this._trainingSettings.epochs)),
      learningrate: JSON.parse(JSON.stringify(this._trainingSettings.learningRate)),
      loss: JSON.parse(JSON.stringify(this._trainingSettings.loss)),
      optimizer: JSON.parse(JSON.stringify(this._trainingSettings.optimizer)),
      dataset: JSON.parse(JSON.stringify(this._trainingSettings.dataset))
    };

    const id = this._selectedNetwork.id;

    this.backend.trainNetwork(id, trainSetup).subscribe(trainedNetwork => {
      this.eventsService.updateSavedNetworksList.next(true);

      const selectedNetwork: SavedNetworks = {
        id: trainedNetwork._id,
        fileName: trainedNetwork.name
      };
      this.dataService.selectedNetwork = selectedNetwork;

      const epochSlider = new EpochSlider();
      epochSlider.maxEpoch = trainedNetwork.epochs;
      epochSlider.currEpoch = trainedNetwork.epochs;
      this.eventsService.updateWeights.next(epochSlider);
    });
  }

}
