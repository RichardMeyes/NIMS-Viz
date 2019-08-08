import { Component, OnInit } from '@angular/core';
import { EventsService } from 'src/app/services/events.service';
import * as d3 from 'd3';
import { debounceTime } from 'rxjs/operators';

/**
 * Component for network graph visualization
 */
@Component({
  selector: 'app-layer-view',
  templateUrl: './layer-view.component.html',
  styleUrls: ['./layer-view.component.css']
})
export class LayerViewComponent implements OnInit {

  constructor(
    private eventsService: EventsService
  ) { }

  ngOnInit() {
    this.eventsService.updateLayerView
      .pipe(
        debounceTime(500)
      )
      .subscribe(val => {
        console.log(val);
        console.log(d3);
      });
  }

}
