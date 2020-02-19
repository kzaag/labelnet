import React, { Component } from 'react';
import { mps, rnds, clrng, mapcl, R, rndc } from './helpers';
import { queryHelpers } from '@testing-library/react';

export class Canvas extends Component {

  state = {
    ccolor: "",
    p1: null,
    p2: null
  }

  cid = rnds(10);
  mid = "m" + this.cid;

  canvas = null;
  ctx = null;
  p1 = null;
  p2 = null;

  cl = 1;

  labels = [];
  labels = clrng();
  popupH = this.labels.length * 65;


  async componentDidMount() {

    this.canvas = document.getElementById(this.cid);
    this.ctx = this.canvas.getContext('2d');

    await this.setState({ ccolor: rndc() });

    this.ctx.strokeStyle = this.state.ccolor;
    this.ctx.lineWidth = "3";

    let elems = document.querySelectorAll('.modal');
    window.M.Modal.init(elems, {});
    elems = document.querySelectorAll('select');
    window.M.FormSelect.init(elems, {});

    window.addEventListener(this.props.dispose, () => {

      this.reset();

    }, false);

    // window.addEventListener(this.props.resize, () => {
    //   console.log(this.props.size.w - 5, this.props.size.h - 5);

    //   if(!this.canvas) {
    //     return;
    //   }


    //   this.canvas.width=this.props.size.w - 5;
    //   this.canvas.height=this.props.size.h - 5;
    //   this.ctx = this.canvas.getContext("2d");

    // }, false);
  }

  mdown(e) {

    if (this.canvas == null) {
      return;
    }

    e.preventDefault();
    this.p1 = mps(this.canvas, e);
  }

  reset() {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.props.size.w, this.props.size.h);
    this.ctx.restore();

    //this.ctx.clearRect(0, 0, this.props.size.w, this.props.size.h);

    this.p2 = null;
    this.p1 = null;
  }

  async mup(e) {

    if (this.canvas == null || this.ctx == null || this.p1 == null || this.p2 == null)
      return;

    e.preventDefault();

    this.p2 = mps(this.canvas, e);

    await this.setState({ p1: this.p1, p2: this.p2 });

    let elem = document.getElementById(this.mid);

    let instance = window.M.Modal.getInstance(elem);

    instance.open();
  }

  fin() {
    let x1 = Math.min(this.p1.x, this.p2.x);
    let y1 = Math.min(this.p1.y, this.p2.y);
    let x2 = Math.max(this.p1.x, this.p2.x);
    let y2 = Math.max(this.p1.y, this.p2.y);
    this.p1 = null;
    this.p2 = null;
    this.props.onfin(R(x1), R(y1), R(x2), R(y2), this.cl, this.state.ccolor);
  }

  mmove(e) {

    e.preventDefault();

    if (this.canvas == null || this.p1 == null) {
      return;
    }
    
    this.p2 = mps(this.canvas, e);
    
    this.ctx.clearRect(0, 0, this.props.size.w, this.props.size.h);

    this.ctx.beginPath();
    this.ctx.rect(this.p1.x, this.p1.y, (this.p2.x - this.p1.x), (this.p2.y - this.p1.y));
    this.ctx.stroke();
  }

  render() {

    return (
      <React.Fragment>
        <div id={this.mid} className="modal">
          <div className="modal-content" style={{minHeight:Math.abs(this.popupH)}}>
            <div className="row">
              <div className="input-field col s12">
                <select value={this.cl} onChange={(e) => this.cl = Number(e.target.value)}>
                  {clrng().map(x => <option key={x} value={x}>{mapcl(x) + " " + mapcl(x, 1)}</option>)}
                </select>
                <label>class</label>
              </div>
              {this.state.p1 && this.state.p2 && (
                <div style={{ overflow: "hidden", marginLeft: 10 , width: Math.abs(this.state.p1.x - this.state.p2.x), height: Math.abs(this.state.p1.y - this.state.p2.y) }}>
                  <img src={this.props.img.src} alt="" width={Math.round(this.props.size.w) - 5} height={Math.round(this.props.size.h) - 5} style={{ marginTop: -Math.min(this.state.p1.y, this.state.p2.y), marginLeft: -Math.min(this.state.p1.x, this.state.p2.x) }}></img>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button onClick={this.reset.bind(this)} className="modal-close waves-effect waves-green btn-flat">Cancel</button>
            <button onClick={this.fin.bind(this)} className="modal-close waves-effect waves-green btn-flat">OK</button>
          </div>
        </div>
        <canvas
          style={{ position: "fixed", borderStyle: "solid", borderColor: this.state.ccolor }}
          onMouseMove={this.mmove.bind(this)}
          onMouseDown={this.mdown.bind(this)}
          onMouseUp={this.mup.bind(this)}
          width={this.props.size.w - 5} height={this.props.size.h - 5}
          id={this.cid}>
        </canvas>
      </React.Fragment>
    );
  }
}