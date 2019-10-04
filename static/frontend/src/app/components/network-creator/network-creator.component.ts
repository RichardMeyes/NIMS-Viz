import { Component, OnInit } from '@angular/core';

import { concatMap } from 'rxjs/operators';

import { BackendCommunicationService } from '../../backendCommunication/backend-communication.service';
import { EventsService } from 'src/app/services/events.service';
import { DataService } from 'src/app/services/data.service';

import { SavedNetworks } from 'src/app/models/saved-networks.model';
import { EpochSlider } from 'src/app/models/layer-view.model';
import { LossFunction, LossFunctionMapping } from 'src/app/models/dropdown.model';
import {
  NeuralNetworkSettings,
  ConvLayer,
  DenseLayer,
  NeuralNetworkSettingsJSON,
  TrainingSettings,
  TrainingSettingsJSON,
  Dense
} from '../../models/neural-network.model';

/**
 * Component for Network creation
 */
@Component({
  selector: 'app-network-creator',
  templateUrl: './network-creator.component.html',
  styleUrls: ['./network-creator.component.scss']
})
export class NetworkCreatorComponent implements OnInit {
  /**
   * loads the possible settings for a neural network
   */
  public _nnSettings: NeuralNetworkSettings;
  public _trainingSettings: TrainingSettings;

  /**
   * attributes to toogle the visibility of the input forms
   */
  public hideConfig = false;
  public hideInput = false;
  public hideCNN = false;
  public hideMLP = false;

  get lossFunctions() {
    return Object.values(LossFunction);
  }

  public LossFunctionMapping = LossFunctionMapping;

  constructor(
    private backend: BackendCommunicationService,
    private eventsService: EventsService,
    private dataService: DataService
  ) {

  }

  ngOnInit() {
    this._nnSettings = this.dataService.nnSettings;
    this._trainingSettings = this.dataService.trainingSettings;
  }

  /**
   * Adds a ConvLayer to the networksettings
   */
  addCNN() {
    this._nnSettings.addConvLayer();
    this.updateTopology();
  }

  /**
   * Adds a MaxPoolingLayer to the networksettings
   */
  addMaxPooling() {
    this._nnSettings.addMaxPooling();
    this.updateTopology();
  }

  /**
   * Deletes a given ConvLayer
   * @param layer Layer that should be deleted
   */
  deleteCNN(layer: ConvLayer) {
    const id = this._nnSettings.convLayers.findIndex(l => layer === l);
    this._nnSettings.deleteConvLayer(id);
    this.updateTopology();
  }

  /**
   * adds a Fully-Connected Layer to the networksettings
   */
  addMLP() {
    this._nnSettings.addDenseLayer(new DenseLayer(Dense.Linear));
    this.updateTopology();
  }

  /**
   * Deletes a given DenseLayer
   * @param layer Layer that should be deleted
   */
  deleteMLP(layer: DenseLayer) {
    const id = this._nnSettings.denseLayers.findIndex(l => layer === l);
    this._nnSettings.deleteDenseLayer(id);
    this.updateTopology();
  }

  /**
   * creates a network based on the networksettings
   */
  createNetwork() {
    const setup: NeuralNetworkSettingsJSON = {
      name: JSON.parse(JSON.stringify(this._nnSettings.name)),
      inputSize: JSON.parse(JSON.stringify(this._nnSettings.inputSize)),
      convLayers: [...this._nnSettings.convLayers],
      denseLayers: [...this._nnSettings.denseLayers]
    };

    const trainSetup: TrainingSettingsJSON = {
      batchSize: JSON.parse(JSON.stringify(this._trainingSettings.batchSize)),
      epochs: JSON.parse(JSON.stringify(this._trainingSettings.epochs)),
      learningrate: JSON.parse(JSON.stringify(this._trainingSettings.learningRate)),
      loss: JSON.parse(JSON.stringify(this._trainingSettings.loss)),
      optimizer: JSON.parse(JSON.stringify(this._trainingSettings.optimizer)),
    };

    this.backend.createNetwork(setup)
      .pipe(
        concatMap(newNetwork => {
          const uuid = newNetwork._id;
          return this.backend.trainNetwork(uuid, trainSetup);
        })
      )
      .subscribe(trainedNetwork => {
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

  /**
   * Resets network settings.
   */
  resetNetwork() {
    this.dataService.nnSettings = new NeuralNetworkSettings();
    this._nnSettings = this.dataService.nnSettings;
  }

  /**
   * Emits update-layer-view event
   */
  updateTopology() {
    this.eventsService.updateTopology.next(this._nnSettings);
  }
}
