import React from 'react';
import ReactDOM from 'react-dom';
import * as serviceWorker from './serviceWorker';
import { AppLoader } from './AppLoader';

window.onbeforeunload = function(e) {
    return 'You sure? you can loose your progress if you reload';
};

ReactDOM.render(<AppLoader />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
