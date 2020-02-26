import React, { Component } from 'react';
import { Canvas } from './Canvas';
import { post as apipost, getix, getimg } from './api';
import { pushret, mapcl, rnds, R, rmtoken, rmret } from './helpers';
import { DEFAULT_SET, DEFAULT_SSET } from './config';

export class App extends Component {

  state = {
    // original picture size
    osize: {
      w: 800,
      h: 500
    },
    // display size
    dsize: {
      w: 1,
      h: 1
    },
    // maximum allowed size - set in constructor
    maxsize: {
      w: -1,
      h: -1
    },
    // scale
    scale: {
      w: 1,
      h: 1
    },
    cs: [],
    queue: [],
    done: [],
    ix: -1,
    annotation: "",
    sset: DEFAULT_SSET,
    set: DEFAULT_SET,
    lname: "",
    lbody: "",
    remote: false,
    rQueue: []
  };

  fname = "";
  sopen = false;

  constructor(props) {
    super(props);

    this.state.maxsize = this.getmsize();

    window.addEventListener('resize', async () => {

      await this.setdisplparams(this.state.osize);

      for (let i = 0; i < this.state.cs.length; i++) {
        this.state.cs[i].cl = -1;
        window.dispatchEvent(this.state.cs[i].dispose);
      }

      await this.setState({ cs: [this.newcanvaselement(this.fname)] });
      this.state.cs[0].cl = -1;
      window.dispatchEvent(this.state.cs[0].dispose);
      await this.setState({ cs: pushret(this.state.cs, this.newcanvaselement(this.fname)) });

      let elems = document.querySelectorAll('.modal');
      window.M.Modal.init(elems, {});

    });

    window.addEventListener('keypress', (e) => {
      let c = String.fromCharCode(e.keyCode);
      c = c.toLowerCase(c);
      switch (c) {
        case 'd':
          (this.state.remote ? this.nextRemImg.bind(this) : this.nextimg.bind(this))();
          break;
        case 'f':
          this.openpostmdl();
          break;
        case 's':
          if (this.sopen) {
            this.closesidenav();
          } else {
            this.opensidenav();
          }
          this.sopen = !this.sopen;
          break;
        default:
          break;
      }

    })

  }

  async nextRemImg(i = true) {

    let ix = this.state.ix;
    let max = this.state.rQueue.length;

    if (ix === -1) {
      return;
    }

    if (i) {
      ix++;
    }

    if (ix >= max) {
      ix = 0;
    }

    await this.setState({ ix: ix });

    await this.openRemImage();
  }

  async nextimg(i = true) {

    let ix = this.state.ix;
    let max = this.state.queue.length;

    if (ix === -1) {
      return;
    }

    if (i) {
      ix++;
    }

    if (ix >= max) {
      ix = 0;
    }

    await this.setState({ ix: ix });

    await this.openImage(this.state.queue[ix]);

  }

  async rmimg() {

    let ix = this.state.ix;
    let queue = this.state.queue;
    let el = queue[ix];

    this.refs.files.value = this.refs.files.value.replace(el.name, "");
    await this.setState({ done: pushret(this.state.done, el.name) });

    if (queue.length <= 1) {
      ix = -1;
    }

    await this.setState({ queue: rmret(queue, ix), ix: ix });


    await this.removeCanvas(-1);

    await this.openImage(null);

  }

  async openpostmdl() {

    if (this.state.ix === -1) {
      return;
    }

    await this.labelGenerate();

    let elem = document.getElementById("cmodal");
    let instance = window.M.Modal.getInstance(elem);
    instance.open();

  }

  async post() {

    let ix = this.state.ix;
    if (ix === -1) {
      return;
    }

    let file = this.state.queue[ix];
    let lbody = this.state.lbody;

    if (!file || !lbody) {
      return;
    }

    let toast = '';

    var reader = new FileReader();

    let instance = this;

    reader.onload = async function (e) {

      let b = e.target.result;

      try {

        let t = new TextEncoder().encode(lbody)
        let x = new Uint8Array(b);

        let body = new Int8Array(t.length + x.length);
        body.set(t);
        body.set(x, t.length);

        let offset = t.length;

        await apipost(body, instance.state.set, instance.state.sset, instance.state.lname, offset);
        toast = '<span>OK</span>';
        window.M.toast({ html: toast, classes: "green darken-1" });

      } catch (err) {
        toast = '<span>couldnt save image.<br/>server says: ' + err + '</span>';
        window.M.toast({ html: toast, inDuration: 2000, classes: "red darken-1" });
        return;
      }

      await instance.rmimg();

      await instance.nextimg(false);

    };

    reader.readAsArrayBuffer(file);

  }

  componentDidMount() {

    let elems = document.querySelectorAll('.sidenav');
    window.M.Sidenav.init(elems, { edge: "right" });

    window.M.updateTextFields();

    this.setdisplparams({ w: 800, h: 500 });

  }

  opensidenav() {

    let element = document.getElementById("slide-out");
    let instance = window.M.Sidenav.getInstance(element);
    instance.open();

  }

  closesidenav() {

    let element = document.getElementById("slide-out");
    let instance = window.M.Sidenav.getInstance(element);
    instance.close();

  }

  // canvas to string
  cats(c) {
    return (
      "<object>\n" +
      "    <name>" + mapcl(c.cl) + "</name>\n" +
      "    <difficult>" + false + "</difficult>\n" +
      "    <small>" + false + "</small>\n" +
      "    <bndbox>\n" +
      "        <xmax>" + c.xmax + "</xmax>\n" +
      "        <xmin>" + c.xmin + "</xmax>\n" +
      "        <ymax>" + c.ymax + "</xmax>\n" +
      "        <ymin>" + c.ymin + "</xmax>\n" +
      "    </bndbox>\n" +
      "    <point>\n" +
      "        <x>" + (c.xmin + c.xmax) / 2 + "</x>\n" +
      "        <y>" + (c.ymin + c.ymax) / 2 + "</y>\n" +
      "    </point>\n" +
      "</object>");
  }

  // file to string
  fits() {
    return (
      "<size>\n" +
      "    <depth>3</depth>\n" +
      "    <height>" + this.state.osize.h + "</height>\n" +
      "    <width>" + this.state.osize.w + "</width>\n" +
      "</size>"
    );
  }

  newcanvaselement(nm) {

    let den = rnds(10);
    //let ren = rnds(10);

    var dispe = new Event(den);
    //var rese = new Event(ren);

    return {
      canvas: <Canvas dispose={den} size={this.state.dsize} img={this.refs.imageView} onfin={this.onfin.bind(this)} />,
      xmin: 0,
      ymin: 0,
      xmax: 0,
      ymax: 0,
      cl: -1,
      color: "",
      dispose: dispe,
      //resize: rese,
      name: nm
    }
  }

  onfin(x1, y1, x2, y2, c, color) {

    x1 = R(x1 / this.state.scale.w);
    x2 = R(x2 / this.state.scale.w);
    y1 = R(y1 / this.state.scale.h);
    y2 = R(y2 / this.state.scale.h);

    // eslint-disable-next-line
    this.state.cs[this.state.cs.length - 1].xmin = x1;
    // eslint-disable-next-line
    this.state.cs[this.state.cs.length - 1].xmax = x2;
    // eslint-disable-next-line
    this.state.cs[this.state.cs.length - 1].ymin = y1;
    // eslint-disable-next-line
    this.state.cs[this.state.cs.length - 1].ymax = y2;
    // eslint-disable-next-line
    this.state.cs[this.state.cs.length - 1].cl = c;
    // eslint-disable-next-line
    this.state.cs[this.state.cs.length - 1].color = color;

    this.setState(pushret(this.state.cs, this.newcanvaselement()));
  }

  getmsize() {

    return { w: document.body.scrollWidth * (8 / 12), h: window.innerHeight - 100 };

  }

  getscale(osize, msize) {

    let ax = msize.w / osize.w;
    let ay = msize.h / osize.h;

    let scale = 1;

    if (ax >= 1 && ay >= 1) {

      scale = 1;

    } else {

      scale = Math.min(ax, ay);

    }

    return { w: scale, h: scale };

  }

  getdisplsize(scale, osize) {

    let dsize = { w: osize.w * scale.w, h: osize.h * scale.h };

    return dsize;

  }

  setdisplparams(osize) {

    let msize = this.getmsize();
    let scale = this.getscale(osize, msize);
    let dsize = this.getdisplsize(scale, osize);

    this.setState({ maxsize: msize, osize: osize, dsize: dsize, scale: scale });

  }

  async openImage(file) {

    if (!file) {
      this.refs.imageView.setAttribute("src", "");
      return;
    }

    if (!file.name)
      return;

    let instance = this;

    let fr = new FileReader();

    fr.onload = (e) => {

      instance.refs.imageView.setAttribute("src", e.target.result);

      var img = new Image();
      img.onload = async function () {

        let osize = { w: this.width, h: this.height };

        instance.setdisplparams(osize);

        instance.fname = file.name;

        //instance.setState({ cs: [instance.newcanvaselement(file.name)] });

        await instance.setState({ cs: [instance.newcanvaselement(file.name)] });
        instance.state.cs[0].cl = -1;
        window.dispatchEvent(instance.state.cs[0].dispose);
        await instance.setState({ cs: pushret(instance.state.cs, instance.newcanvaselement(file.name)) });

      }

      img.src = e.target.result;
    }

    fr.readAsDataURL(file);

  }

  doneLength() {
    return (this.state.done && this.state.done.length) || 0;
  }

  queueLength() {
    return (this.state.queue && this.state.queue.length) || 0;
  }

  async uploadfiles() {

    await this.setState({ cs: [] });

    let fileInput = this.refs.p_image;

    if (!fileInput || !fileInput.files || !fileInput.files[0])
      return;

    let ix = 0;

    let file = fileInput.files[ix];

    this.openImage(file);

    this.setState({ queue: Array.from(fileInput.files), ix: ix })

  }

  async reset() {

    //await this.rmimg();
    await this.setState({ cs: [], queue: [], done: [], ix: 0 });
    this.refs.files.value = "";

  }

  async openRemImage() {

    let name = this.state.rQueue[this.state.ix];

    if (!name) {
      return;
    }

    let hdrs = ["alen"]

    let x = await getimg(this.state.set, this.state.sset, name, hdrs);

    if (!hdrs[0]) {
      return;
    }

    let alen = Number(hdrs[0]);
    //BlobBuilder = window.MozBlobBuilder || window.WebKitBlobBuilder || window.BlobBuilder;

    let annot = x.substr(0, alen);
    let imgb = x.substr(alen, x.length);
    let instance = this;
    var img = new Image();
    var response = imgb;
    var binary = "";

    for (let i = 0; i < response.length; i++) {
      binary += String.fromCharCode(response.charCodeAt(i) & 0xff);
    }

    img.onload = async function () {

      let osize = { w: this.width, h: this.height };

      instance.setdisplparams(osize);

      await instance.setState({ cs: [instance.newcanvaselement(name)] });
      instance.state.cs[0].cl = -1;
      window.dispatchEvent(instance.state.cs[0].dispose);
      let canvas = instance.newcanvaselement(name);
      await instance.setState({ cs: pushret(instance.state.cs, canvas) });

    }

    let src = 'data:image/jpeg;base64,' + btoa(binary)

    img.src = src;
    instance.refs.imageView.setAttribute("src", src);

  }

  async remoteGetIndex() {

    await this.reset();

    let x = await getix(this.state.set, this.state.sset);

    let queue = x.split("\n");

    let fq = [];

    for (let i = 0; i < queue.length; i++) {
      if (queue[i]) {
        fq.push(queue[i]);
      }
    }

    await this.setState({ remote: true, rQueue: fq });

    await this.openRemImage();

  }

  // remove object at index
  async removeCanvas(ix) {

    if (ix === -1) {

      for (let i = 0; i < this.state.cs.length; i++) {

        // eslint-disable-next-line
        this.state.cs[i].cl = -1;
        window.dispatchEvent(this.state.cs[i].dispose);

      }

      this.setState({ cs: [] });

    } else {

      let tmp = [];
      for (let i = 0; i < this.state.cs.length; i++) {

        if (i === ix) {
          // eslint-disable-next-line
          this.state.cs[i].cl = -1;
          window.dispatchEvent(this.state.cs[i].dispose);
        }

        tmp.push(this.state.cs[i]);

      }

      this.setState({ cs: tmp });
    }

  }

  async logout() {
    rmtoken();
    window.location = "/";

  }

  labelGenerate() {

    let cs = this.state.cs;

    let fname = rnds(2) + Number(Date.now());

    this.setState({ lname: fname });

    let lbl =
      "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n" +
      "<annotation xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\">\n" +
      "<filename>" + fname + "</filename>\n";

    for (let i = 0; i < cs.length; i++) {
      if (cs[i].cl === -1) {
        continue;
      }
      lbl += this.cats(cs[i]) + "\n";
    }

    lbl += this.fits() + "\n";

    lbl += "</annotation>";

    this.setState({ lbody: lbl });
  }

  render() {
    return (
      <React.Fragment>

        <div id="cmodal" className="modal modal-fixed-footer">
          <div className="modal-content">
            <h5>Podsumowanie</h5>
            <pre>
              {this.state.lbody}
            </pre>
          </div>
          <div className="modal-footer">
            <button className="modal-close waves-effect waves-green btn-flat">anuluj</button>
            <button onClick={this.post.bind(this)} className="modal-close waves-effect waves-green btn-flat">potwierdź</button>
          </div>
        </div>

        <div className="navbar-fixed">
          <nav>
            <div className="nav-wrapper">
              <a href="#!" className="brand-logo" style={{ marginLeft: 10 }}>Labelnet</a>
              <ul className="right hide-on-med-and-down">
                <li>
                  <a
                    onClick={this.logout.bind(this)}
                    href="/#"><i className="material-icons">exit_to_app</i>
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <ul id="slide-out" className="sidenav" style={{ width: 400 }}>
          <div className="row">
            {this.state.cs && this.state.cs.map((lb, i) => lb.cl !== -1 && (
              <React.Fragment key={i}>
                <div>
                  <div className="card" style={{ borderStyle: "solid", borderColor: lb.color }}>
                    <div className="card-content">
                      <pre>
                        {
                          this.cats(lb)
                        }
                      </pre>
                      <div className="row">
                        <button className="waves-effect waves-teal btn red darken-1 right-align" style={{ width: "100%" }}
                          type="button" onClick={() => this.removeCanvas(this.state.cs.indexOf(lb))}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </ul>

        <div style={{ marginTop: 10 }}>

          <div className="row">

            <div className="col s8">
              <div style={{ width: this.state.dsize.w, height: this.state.dsize.h }}>
                <img ref="imageView"
                  width={this.state.dsize.w}
                  height={this.state.dsize.h}
                  src="a.jpg"
                  alt=""
                  style={{ position: "fixed" }}>
                </img>
                {this.state.cs && this.state.cs.map((lb, i) => <React.Fragment key={i}>{lb.canvas}</React.Fragment>)}
              </div>
            </div>

            <div className="col s4">
              <div style={{ marginLeft: 20 }}>
                <div className="input-field">
                  <input value={this.state.set} onChange={(e) => this.setState({ set: e.target.value })} id="seti" type="text" className="validate" />
                  <label htmlFor="seti">set name</label>
                </div>
                <div className="input-field">
                  <input value={this.state.sset} onChange={(e) => this.setState({ sset: e.target.value })} id="sseti" type="text" className="validate" />
                  <label htmlFor="sseti">subset name</label>
                </div>
                <div className="file-field input-field">
                  <div className="btn">
                    <span>upload jpgs</span>
                    <input type="file"
                      ref="p_image"
                      onChange={this.uploadfiles.bind(this)} multiple />
                  </div>
                  <div className="file-path-wrapper">
                    <input ref="files" className="file-path validate" type="text" style={{ display: "hidden" }} />
                  </div>
                </div>
                <div>
                  <h5>Queue:</h5>
                  <p>{this.state.remote ? (
                    this.state.rQueue && this.state.rQueue.map((n, i) => {
                      if (i === this.state.ix) {
                        return <span key={i} style={{ fontSize: 20 }}>{n + " "}</span>;
                      } else {
                        return <span key={i} style={{ color: "grey" }}>{n + " "}</span>
                      }
                    })
                  ) : (
                      this.state.queue && this.state.queue.map((n, i) => {
                        if (i === this.state.ix) {
                          return <span key={i} style={{ fontSize: 20 }}>{n.name + " "}</span>;
                        } else {
                          return <span key={i} style={{ color: "grey" }}>{n.name + " "}</span>
                        }
                      })
                    )}</p>
                </div>
                <div>
                  <h5>Done: {this.doneLength()} / {this.doneLength() + this.queueLength()} </h5>
                  <p>{this.state.done && this.state.done.map((n, i) => {
                    return <span key={i} style={{ color: "grey" }}>{n + " "}</span>
                  })}</p>
                </div>

                <div >

                  <button type="button"
                    onClick={this.remoteGetIndex.bind(this)}
                    className="waves-effect waves-light btn"
                    style={{ marginTop: 5, marginRight: 10 }}>Load subset</button>

                  <button type="button"
                    onClick={this.opensidenav.bind(this)}
                    className="waves-effect waves-light btn"
                    style={{ marginTop: 5, marginRight: 10 }}>Selected ( s )</button>

                  <button type="button"
                    onClick={this.state.remote ? this.nextRemImg.bind(this) : this.nextimg.bind(this)}
                    className="waves-effect waves-light btn"
                    style={{ marginTop: 5, marginRight: 10 }}>Next ( d ) </button>

                  <button type="button"
                    onClick={this.openpostmdl.bind(this)}
                    className="waves-effect waves-light btn"
                    style={{ marginTop: 5, marginRight: 10 }}>Send ( f ) </button>

                </div>

              </div>
            </div>

          </div>

        </div>
      </React.Fragment >
    );
  }
}