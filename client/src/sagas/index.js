import { all, fork } from 'redux-saga/effects';

import { watcherGetDevices as devices } from './devices';
import { watcherSaga as dogs } from '../sagas.js'

export default function* sagas() {
  yield all(
    fork(devices),
    fork(dogs)
  );
}
