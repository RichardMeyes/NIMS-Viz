import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { EventsService } from 'src/app/services/events.service';
import * as d3 from 'd3';
import { debounceTime } from 'rxjs/operators';
import { NeuralNetworkSettings } from 'src/app/models/create-nn.model';

/**
 * Component for network graph visualization
 */
@Component({
  selector: 'app-layer-view',
  templateUrl: './layer-view.component.html',
  styleUrls: ['./layer-view.component.css']
})
export class LayerViewComponent implements OnInit {
  /**
   * Visualization's container.
   */
  @ViewChild('container', { static: false }) container: ElementRef;

  /**
   * SVG configurations.
   */
  svg; svgWidth; svgHeight;
  zoom; currTransform;

  /**
   * Configurations for centering the visualization.
   */
  minWidthHeight;
  topMargin; leftMargin;

  /**
   * Graph configurations.
   */
  graphGroup;

  constructor(
    private eventsService: EventsService
  ) { }

  ngOnInit() {
    this.eventsService.updateLayerView
      .pipe(
        debounceTime(500)
      )
      .subscribe(nnSettings => {
        this.resetViz();
        this.setupTopology(nnSettings);
        this.bindTopology();
      });
  }

  /**
   * Reshape nn settings to graph topology.
   * @param nnSettings nn settings
   */
  setupTopology(nnSettings: NeuralNetworkSettings) {
    // let convLayers: number[] = [1];
    // let layers: number[] = [];
    // const filteredTopology = [];
    // const filteredEdges = [];

    // let unitsPerColumn;
    // const unitSpacing = { otherColumns: 0, lastColumn: 0 };
    // const targetUnitSpacing = { otherColumns: 0, lastColumn: 0 };

    // convLayers = convLayers.concat(this.inputTopology['conv_layers'].map(conv_layer => +conv_layer.outChannel));
    // layers = layers.concat(this.inputTopology['layers'].map(layer => +layer));
    // layers.push(10);


    // unitsPerColumn = Math.floor((this.minWidthHeight + this.defaultSettings.unitGutter) /
    //   (this.defaultSettings.rectSide + this.defaultSettings.unitGutter));
    // unitSpacing.otherColumns = this.minWidthHeight / unitsPerColumn;
    // targetUnitSpacing.otherColumns = this.minWidthHeight / unitsPerColumn;
    // convLayers.forEach((convLayer, convLayerIndex) => {
    //   let nextLayer = layers[0];
    //   if (convLayerIndex < convLayers.length - 1) {
    //     nextLayer = convLayers[convLayerIndex + 1];
    //   }

    //   const totalColumns = { layer: 1, nextLayer: 1 };
    //   const column = { layer: -1, nextLayer: -1 };
    //   if (convLayer > unitsPerColumn) { totalColumns.layer = Math.ceil(convLayer / unitsPerColumn); }
    //   if (nextLayer > unitsPerColumn) { totalColumns.nextLayer = Math.ceil(nextLayer / unitsPerColumn); }

    //   if (totalColumns.layer % 2 === 1) {
    //     column.layer = Math.floor(totalColumns.layer / 2) * -1 - 1;
    //   } else {
    //     column.layer = (totalColumns.layer - 1) / 2 * -1 - 1;
    //   }

    //   unitSpacing.lastColumn = this.minWidthHeight / unitsPerColumn;
    //   if (convLayer % unitsPerColumn !== 0) { unitSpacing.lastColumn = this.minWidthHeight / (convLayer % unitsPerColumn); }

    //   for (let i = 0; i < convLayer; i++) {
    //     let currUnitSpacing = unitSpacing.otherColumns;
    //     if (i % unitsPerColumn === 0) { column.layer++; }
    //     if (Math.floor(i / unitsPerColumn) + 1 === totalColumns.layer) { currUnitSpacing = unitSpacing.lastColumn; }

    //     filteredTopology.push({
    //       layer: convLayerIndex,
    //       unit: i,
    //       column: column.layer,
    //       unitSpacing: currUnitSpacing,
    //       unitsPerColumn: unitsPerColumn,
    //       isOutput: false,
    //       isConv: true
    //     });


    //     if (totalColumns.nextLayer % 2 === 1) {
    //       column.nextLayer = Math.floor(totalColumns.nextLayer / 2) * -1 - 1;
    //     } else {
    //       column.nextLayer = (totalColumns.nextLayer - 1) / 2 * -1 - 1;
    //     }

    //     targetUnitSpacing.lastColumn = this.minWidthHeight / unitsPerColumn;
    //     if (nextLayer % unitsPerColumn !== 0) { targetUnitSpacing.lastColumn = this.minWidthHeight / (nextLayer % unitsPerColumn); }

    //     for (let j = 0; j < nextLayer; j++) {
    //       let targetCurrUnitSpacing = targetUnitSpacing.otherColumns;
    //       if (j % unitsPerColumn === 0) { column.nextLayer++; }
    //       if (Math.floor(j / unitsPerColumn) + 1 === totalColumns.nextLayer) { targetCurrUnitSpacing = targetUnitSpacing.lastColumn; }

    //       filteredEdges.push({
    //         layer: convLayerIndex,
    //         source: i,
    //         target: j,
    //         column: column.layer,
    //         targetColumn: column.nextLayer,
    //         unitSpacing: currUnitSpacing,
    //         targetUnitSpacing: targetCurrUnitSpacing,
    //         unitsPerColumn: unitsPerColumn
    //       });
    //     }
    //   }
    // });

    // unitsPerColumn = Math.floor((this.minWidthHeight + this.defaultSettings.unitGutter) /
    //   (this.defaultSettings.nodeRadius * 2 + this.defaultSettings.unitGutter));
    // unitSpacing.otherColumns = this.minWidthHeight / unitsPerColumn;
    // targetUnitSpacing.otherColumns = this.minWidthHeight / unitsPerColumn;
    // layers.forEach((layer, layerIndex) => {
    //   const nextLayer = layers[layerIndex + 1];
    //   const isOutput = (layerIndex < layers.length - 1) ? false : true;

    //   const totalColumns = { layer: 1, nextLayer: 1 };
    //   const column = { layer: -1, nextLayer: -1 };
    //   if (layer > unitsPerColumn) { totalColumns.layer = Math.ceil(layer / unitsPerColumn); }
    //   if (nextLayer > unitsPerColumn) { totalColumns.nextLayer = Math.ceil(nextLayer / unitsPerColumn); }

    //   if (totalColumns.layer % 2 === 1) {
    //     column.layer = Math.floor(totalColumns.layer / 2) * -1 - 1;
    //   } else {
    //     column.layer = (totalColumns.layer - 1) / 2 * -1 - 1;
    //   }

    //   unitSpacing.lastColumn = this.minWidthHeight / unitsPerColumn;
    //   if (layer % unitsPerColumn !== 0) { unitSpacing.lastColumn = this.minWidthHeight / (layer % unitsPerColumn); }

    //   for (let i = 0; i < layer; i++) {
    //     let currUnitSpacing = unitSpacing.otherColumns;
    //     if (i % unitsPerColumn === 0) { column.layer++; }
    //     if (Math.floor(i / unitsPerColumn) + 1 === totalColumns.layer) { currUnitSpacing = unitSpacing.lastColumn; }

    //     filteredTopology.push({
    //       layer: convLayers.length + layerIndex,
    //       unit: i,
    //       column: column.layer,
    //       unitSpacing: currUnitSpacing,
    //       unitsPerColumn: unitsPerColumn,
    //       isOutput: isOutput,
    //       isConv: false
    //     });

    //     if (!isOutput) {
    //       if (totalColumns.nextLayer % 2 === 1) {
    //         column.nextLayer = Math.floor(totalColumns.nextLayer / 2) * -1 - 1;
    //       } else {
    //         column.nextLayer = (totalColumns.nextLayer - 1) / 2 * -1 - 1;
    //       }

    //       targetUnitSpacing.lastColumn = this.minWidthHeight / unitsPerColumn;
    //       if (nextLayer % unitsPerColumn !== 0) { targetUnitSpacing.lastColumn = this.minWidthHeight / (nextLayer % unitsPerColumn); }

    //       for (let j = 0; j < nextLayer; j++) {
    //         let targetCurrUnitSpacing = targetUnitSpacing.otherColumns;
    //         if (j % unitsPerColumn === 0) { column.nextLayer++; }
    //         if (Math.floor(j / unitsPerColumn) + 1 === totalColumns.nextLayer) { targetCurrUnitSpacing = targetUnitSpacing.lastColumn; }

    //         filteredEdges.push({
    //           layer: convLayers.length + layerIndex,
    //           source: i,
    //           target: j,
    //           column: column.layer,
    //           targetColumn: column.nextLayer,
    //           unitSpacing: currUnitSpacing,
    //           targetUnitSpacing: targetCurrUnitSpacing,
    //           unitsPerColumn: unitsPerColumn
    //         });
    //       }
    //     }
    //   }
    // });


    // this.layerSpacing = this.minWidthHeight / (convLayers.length + layers.length);
    // this.topology = filteredTopology;
    // this.edges = filteredEdges;
  }

  bindTopology() {
    // const self = this;


    // const line = this.vizContainer.selectAll('.edges')
    //   .data(this.edges);

    // line.enter()
    //   .append('line')
    //   .attr('class', 'edges')
    //   .attr('x1', function (d) {
    //     const x1: number = self.leftMargin +
    //       self.layerSpacing * d.layer +
    //       (self.defaultSettings.nodeRadius * 2 + self.defaultSettings.unitGutter) * d.column +
    //       self.layerSpacing / 2;
    //     return x1;
    //   })
    //   .attr('y1', function (d) {
    //     const y1: number = self.topMargin +
    //       d.unitSpacing * (d.source % d.unitsPerColumn) +
    //       d.unitSpacing / 2;
    //     return y1;
    //   })
    //   .attr('x2', function (d) {
    //     const x2: number = self.leftMargin +
    //       self.layerSpacing * (d.layer + 1) +
    //       (self.defaultSettings.nodeRadius * 2 + self.defaultSettings.unitGutter) * d.targetColumn +
    //       self.layerSpacing / 2;
    //     return x2;
    //   })
    //   .attr('y2', function (d) {
    //     const y2: number = self.topMargin +
    //       d.targetUnitSpacing * (d.target % d.unitsPerColumn) +
    //       d.targetUnitSpacing / 2;
    //     return y2;
    //   });


    // let rects = this.vizContainer.selectAll('rect')
    //   .data(this.topology.filter(nodes => nodes.isConv));

    // rects = rects.enter()
    //   .append('rect')
    //   .attr('class', 'rect')
    //   .attr('x', function (d) {
    //     const x: number = self.leftMargin +
    //       self.layerSpacing * d.layer +
    //       (self.defaultSettings.rectSide + self.defaultSettings.unitGutter) * d.column +
    //       self.layerSpacing / 2 -
    //       0.5 * self.defaultSettings.rectSide;
    //     return x;
    //   })
    //   .attr('y', function (d) {
    //     const y: number = self.topMargin +
    //       d.unitSpacing * (d.unit % d.unitsPerColumn) +
    //       d.unitSpacing / 2 -
    //       0.5 * self.defaultSettings.rectSide;
    //     return y;
    //   })
    //   .attr('width', this.defaultSettings.rectSide)
    //   .attr('height', this.defaultSettings.rectSide)
    //   .attr('fill', this.defaultSettings.color)
    //   .attr('fill-opacity', this.defaultSettings.nodeOpacity);


    // const circles = this.vizContainer.selectAll('circle')
    //   .data(this.topology.filter(nodes => !nodes.isConv));

    // circles.enter()
    //   .append('circle')
    //   .attr('class', 'circle')
    //   .attr('cx', function (d) {
    //     const cx: number = self.leftMargin +
    //       self.layerSpacing * d.layer +
    //       (self.defaultSettings.nodeRadius * 2 + self.defaultSettings.unitGutter) * d.column +
    //       self.layerSpacing / 2;
    //     return cx;
    //   })
    //   .attr('cy', function (d) {
    //     const cy: number = self.topMargin +
    //       d.unitSpacing * (d.unit % d.unitsPerColumn) +
    //       d.unitSpacing / 2;
    //     return cy;
    //   })
    //   .attr('r', this.defaultSettings.nodeRadius)
    //   .attr('fill', this.defaultSettings.color)
    //   .attr('fill-opacity', this.defaultSettings.nodeOpacity);
  }

  /**
   * Resets visualization
   */
  resetViz() {
    this.svgWidth = this.container.nativeElement.offsetWidth;
    this.svgHeight = this.container.nativeElement.offsetHeight;

    this.minWidthHeight = Math.min(this.svgWidth, this.svgHeight);
    this.topMargin = (this.svgHeight - this.minWidthHeight) / 2;
    this.leftMargin = (this.svgWidth - this.minWidthHeight) / 2;


    if (this.svg) { this.svg.remove(); }
    this.svg = d3.select(this.container.nativeElement)
      .append('svg')
      .attr('width', this.svgWidth)
      .attr('height', this.svgHeight);
    this.graphGroup = this.svg.append('g');

    const self = this;
    this.zoom = d3.zoom()
      .scaleExtent([0.1, 10])
      .on('zoom', () => {
        self.graphGroup.attr('transform', d3.event.transform);
      })
      .on('end', () => { this.currTransform = d3.event.transform; });
    this.svg.call(this.zoom);

    this.svg.on('contextmenu', () => { d3.event.preventDefault(); });
  }

}
