import { Component, OnInit, AfterViewInit } from '@angular/core';
import { NeuralNetworkSettings, ConvLayer, DenseLayer } from '../../models/create-nn.model';
import { BackendCommunicationService } from '../../backendCommunication/backend-communication.service';
import { EventsService } from 'src/app/services/events.service';

/**
 * Component for Network creation
 */
@Component({
  selector: 'app-network-creator',
  templateUrl: './network-creator.component.html',
  styleUrls: ['./network-creator.component.css']
})
export class NetworkCreatorComponent implements OnInit, AfterViewInit {
  /**
   * loads the possible settings for a neural network
   */
  private _nnSettings = new NeuralNetworkSettings();

  /**
   * attributes to toogle the visibility of the input forms
   */
  public hideInput = false;
  public hideCNN = false;
  public hideMLP = false;

  constructor(
    private backend: BackendCommunicationService,
    private eventsService: EventsService
  ) {

  }

  ngOnInit() {
  }


  ngAfterViewInit() {
  }



  /**
   * Adds a ConvLayer to the networksettings
   */
  addCNN() {
    this._nnSettings.addConvLayer();
  }

  /**
   * Deletes a given ConvLayer
   * @param layer Layer that should be deleted
   */
  deleteCNN(layer: ConvLayer) {
    const id = this._nnSettings.convLayers.findIndex(l => layer === l);
    this._nnSettings.deleteConvLayer(id);
  }

  /**
   * adds a Fully-Connected Layer to the networksettings
   */
  addMLP() {
    this._nnSettings.addDenseLayer(new DenseLayer());
  }

  /**
   * Deletes a given DenseLayer
   * @param layer Layer that should be deleted
   */
  deleteMLP(layer: DenseLayer) {
    const id = this._nnSettings.denseLayers.findIndex(l => layer === l);
    this._nnSettings.deleteDenseLayer(id);
  }

  /**
   * creates a network based on the networksettings
   * Not implemented yet
   */
  createNetwork() {
    //this.backend.createNetwork();
  }


  /**
   * Emits update-layer-view event
   */
  updateLayerView() {
    this.eventsService.updateLayerView.next(this._nnSettings);
  }
}
