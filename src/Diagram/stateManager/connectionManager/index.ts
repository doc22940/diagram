import { EventBus } from "../../../EventBus";
import { DiagramState } from "../../../Models/DiagramState";
import * as Events from "../../../Events";
import { ScreenPosition } from "../../../IO/ScreenPosition";
import { Node, Link } from "../../../Models";
import { Utils } from "../../../Utils";

/**
 * ConnectionManager:
 *
 * Connection Manager is for connections:
 */
export class ConnectionManager {
  constructor(
    private eventBus: EventBus,
    private state: DiagramState,
    private connectionFunction: (input: Node, output: Node) => boolean
  ) {
    this.eventBus.subscribe(
      Events.IOEvents.WorldLeftMouseClick,
      this.startDrawingConnector
    );
    this.eventBus.subscribe(
      Events.IOEvents.ScreenLeftMouseUp,
      this.endDrawingConnector
    );
  }
  startDrawingConnector = (e: ScreenPosition) => {
    const { io, node } = this.state.hover;
    if (io && node) {
      this.state.draw = {
        node,
        io,
        initialPos: e
      };
      return;
    }
    this.state.draw = undefined;
  };
  drawConnector = (e: ScreenPosition, pan: ScreenPosition) => {
    if (!this.state.draw) {
      return;
    }
    const { io, node } = this.state.draw;
    if (!io || !node) {
      return;
    }
    this.state.drawedConnection = { x: e.x - pan.x, y: e.y - pan.y };
    this.eventBus.publish(Events.DiagramEvents.RenderRequested);
  };
  makeConnection = (i: Node, o: Node) => {
    const linkExists = () =>
      !!this.state.links.find(l => l.i === i && l.o === o);
    const correctType = () => {
      const acceptsInputs = Utils.getDefinitionAcceptedInputs(i.definition)
      if (!acceptsInputs) {
        return false;
      }
      for (const ai of acceptsInputs) {
        if (ai.node.type === o.type) {
          return true;
        }
        if (o.definition.parent) {
          if (ai.node.type === o.definition.parent.node.type) {
            return true;
          }
        }
      }
      return false;
    };
    if (!this.connectionFunction(i, o) || linkExists() || !correctType()) {
      this.state.drawedConnection = undefined;
      this.eventBus.publish(Events.DiagramEvents.RenderRequested);
      return;
    }
    console.log(`connection between input ${i.type} - output ${o.type}`);
    const newLink: Link = {
      o: o,
      i: i
    };
    this.state.links.push(newLink);
    i.inputs!.push(o);
    o.outputs!.push(i);
    return newLink;
  };
  endDrawingConnector = (e: ScreenPosition) => {
    if (!this.state.draw) {
      return;
    }
    if (this.state.hover.io && this.state.hover.io !== this.state.draw!.io) {
      const input =
        this.state.hover.io === "i"
          ? this.state.hover.node!
          : this.state.draw!.node;
      const output =
        this.state.hover.io === "o"
          ? this.state.hover.node!
          : this.state.draw!.node;
      this.makeConnection(input, output);
    }
    this.state.drawedConnection = undefined;
    this.eventBus.publish(Events.DiagramEvents.RenderRequested);
  };
}
