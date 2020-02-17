import React, { Component } from 'react';
import { App } from './App';
import { gettoken, settoken, rmtoken } from './helpers';
import { login as apilogin, validate } from './api';

export class AppLoader extends Component {

    state = {
        ok: false,
        msg: "you shall be remembered",
        c: "gray",
        d: false
    };

    async componentDidMount() {

        if (gettoken()) {

            if (204 === await validate()) {
                this.setState({ ok: true });
            } else {
                rmtoken();
            }

        } else {
            this.setState({ ok: false });
        }

    }

    async login(e) {
        e.preventDefault();
        try {

            let res = await apilogin(this.refs.name.value, this.refs.password.value);

            settoken(res);

            this.setState({ msg: "you shall be remembered", c: "gray", d: false, ok: true });
        } catch {
            this.setState({ msg: "you shall not pass", c: "red", d: true })
        }


    }

    render() {
        return (
            <React.Fragment>
                {this.state.ok ? (
                    <App />
                ) : (
                        <form onSubmit={this.login.bind(this)} style={{ marginTop: "15%" }}>
                            <div className="row">
                                <div className="col s0 m4"></div>
                                <div className="col s12 m4">
                                    <div className="card">
                                        <div className="card-content">
                                            <span className="card-title">Login</span>
                                            <p style={{ color: this.state.c }}>
                                                {this.state.d && <img width={30} height={40} src="gandalf.jpg" alt=":("></img>}
                                                {this.state.msg}
                                            </p>
                                            <div className="input-field">
                                                <input className="validate" ref="name" id="name" type="text" />
                                                <label htmlFor="name">user name</label>
                                            </div>
                                            <div className="input-field">
                                                <input clan="validate" ref="password" id="password" type="password" />
                                                <label htmlFor="password">password</label>
                                            </div>
                                            <button className="waves-effect waves-light btn" type="submit">Login</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    )}
            </React.Fragment>
        )
    }
}