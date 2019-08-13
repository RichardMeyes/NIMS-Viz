import { Component, OnInit, AfterViewInit } from '@angular/core';
import { NeuralNetworkSettings, ConvLayer, DenseLayer, NeuralNetworkSettingsJSON } from '../../models/create-nn.model';
import { BackendCommunicationService } from '../../backendCommunication/backend-communication.service';
import { EventsService } from 'src/app/services/events.service';
import { DataService } from 'src/app/services/data.service';
import { EpochSlider } from 'src/app/models/layer-view.model';

/**
 * Component for Network creation
 */
@Component({
  selector: 'app-network-creator',
  templateUrl: './network-creator.component.html',
  styleUrls: ['./network-creator.component.scss']
})
export class NetworkCreatorComponent implements OnInit, AfterViewInit {
  /**
   * loads the possible settings for a neural network
   */
  private _nnSettings: NeuralNetworkSettings;

  /**
   * attributes to toogle the visibility of the input forms
   */
  public hideConfig = false;
  public hideInput = false;
  public hideCNN = false;
  public hideMLP = false;

  constructor(
    private backend: BackendCommunicationService,
    private eventsService: EventsService,
    private dataService: DataService
  ) {

  }

  ngOnInit() {
    this._nnSettings = this.dataService.nnSettings;
  }


  ngAfterViewInit() {
  }



  /**
   * Adds a ConvLayer to the networksettings
   */
  addCNN() {
    this._nnSettings.addConvLayer();
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
    this._nnSettings.addDenseLayer(new DenseLayer());
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
   * Not implemented yet
   */
  createNetwork() {
    const setup: NeuralNetworkSettingsJSON = {
      configurations: JSON.parse(JSON.stringify(this._nnSettings.configurations)),
      inputSize: JSON.parse(JSON.stringify(this._nnSettings.inputSize)),
      convLayers: [...this._nnSettings.convLayers],
      denseLayers: [...this._nnSettings.denseLayers]
    };

    this.backend.createNetwork(setup).subscribe(filename => {
      this.dataService.selectedNetwork = filename;

      const epochSlider = new EpochSlider();
      epochSlider.maxEpoch = this._nnSettings.configurations.epoch;
      epochSlider.currEpoch = this._nnSettings.configurations.epoch;
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
