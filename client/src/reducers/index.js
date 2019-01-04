import { combineReducers } from 'redux';
import { reducer as dog } from '../redux';
import devices from './devices';

console.log(dog);
export default combineReducers({
    dog,
    devices
});
