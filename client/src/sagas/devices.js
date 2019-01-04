import { GET, GET_ERROR, GET_SUCCESS } from '../constants/devices';
import { takeLatest, call, put } from "redux-saga/effects";

async function getDevices() {
    const response = await fetch('/hello/world');
    return response.json();
}

export function* watcherGetDevices() {
    yield takeLatest(GET, workerGetDevices);
}

function* workerGetDevices() {
    try {
        const response = yield call(getDevices);
        yield put({
            type: GET_SUCCESS,
            list: response
        })
    } catch(e) {
        yield put({
            type: GET_ERROR,
            error: e.message
        })
    }
}
