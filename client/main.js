import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';
import { enc, lib } from 'crypto-js';

import './main.html';

let cb = (label, res) => {
  console.log("CB " + label + ": ", res);
};

let chromeTV = {
  measurement: "0D7C6160-FAB2-11E4-9FBB-0002A5D5C51B",
  service: "FEA0"
}
let pulseOx = {
  service: "FF70", //"636F6D2E-6A69-7561-6E2E-414D56313100",
  measurement: "FF71", //"7265632E-6A69-7561-6E2E-414D56313100"
}
let steps = {
  service: "636F6D2E-6A69-7561-6E2E-414D56313100",
  measurement: "7265632E-6A69-7561-6E2E-414D56313100"
}
let deviceGATT = {
  service: "180A",
  measurement: "2A29"
}
Template.hello.onCreated(function helloOnCreated() {
  // counter starts at 0
  this.counter = new ReactiveVar(0);
  console.log('enc', enc)
});

Template.hello.helpers({
  counter() {
    return Template.instance().counter.get();
  },
});

Template.hello.events({
  'click #button1'(event, instance) {
    instance.counter.set(instance.counter.get() + 1);
    let seconds = 10; // scan duration (s)
    let am3sId = "00:4D:32:04:0B:E3";
    let am3sServices = [ "1800", "1801", "180a", "636f6d2e-6a69-7561-6e2e-414d56313100", "fee7" ];
    let am3suuid = "F010E4C1-5D05-CC7E-24BC-456892AA00A9";
    let am3suuid2 = "AACBF145-B8B2-884F-DBBE-A4EDEF7F51E2";
    let services = [];
    let services2 = [chromeTV.service]; // list of services to discover, [] for all

    let discovered = [];
    (new Promise((resolve, reject)=> {
      ble.scan(services, seconds, (discoveredDevice) => {
        let discoveredIDs = discovered.map((obj)=>obj.id);
        let existingIndex = discoveredIDs.indexOf(discoveredDevice.id);
        if(existingIndex === -1)
          discovered.push(discoveredDevice);
        else {
          console.log("discoveredIDs", discoveredIDs);
          console.log("existingIndex", existingIndex);
          console.log("before", discovered[existingIndex]);
          Object.assign(discovered[existingIndex], discoveredDevice)
          console.log("after", discovered[existingIndex]);
        }

        let adData;
        if(device.platform === "iOS") {
          let adData0 = discoveredDevice.advertising;
          adData = Object.keys(adData0).map((k)=>{
            if(Object.prototype.toString.call(adData0[k]) === "[object ArrayBuffer]") {
              // console.log(k + ' is ArrayBuffer: ', adData0[k], new Uint8Array(adData0[k]), String.fromCharCode.apply(null, new Uint8Array(adData0[k])))
              // let arrayBuffer = adData0[k];
              // var wordArray = lib.WordArray.create(arrayBuffer);
              // var base64 = enc.Base64.stringify(wordArray);
              // console.log('base64:', base64);

              // //decrypt
              // var parsedWordArray = enc.Base64.parse(base64);
              // console.log("parsed:", parsedWordArray.toString(enc.Base64));
              // console.log("parsed:", parsedWordArray.toString(enc.Hex));
              // console.log("parsed:", parsedWordArray.toString(enc.Latin1));
              // console.log("parsed:", parsedWordArray.toString(enc.Utf8));

              return String.fromCharCode.apply(null, new Uint8Array(adData0[k]));
            } else
              return adData0[k]
          })
          console.log('device found', adData);
        } else if(device.platform === "Android") {
          console.log('android');
          adData = String.fromCharCode.apply(null, new Uint8Array(discoveredDevice.advertising.slice(3)));
          console.log('device found', discoveredDevice, adData, new Uint8Array(discoveredDevice.advertising))
        } else {
          console.log('not ios or android')
        }
      }, reject)
      Meteor.setTimeout(()=> {
        discovered.sort((obj)=>obj.rssi);
        console.log('sort by rssi', discovered)
        let nearestAM3S = discovered.filter((obj)=>obj.name=="Pulse Oximeter")[0];
        console.log('nearestAM3S', nearestAM3S);
        resolve(nearestAM3S);
      }, seconds*1000);
    }))
    .then((discoveredDevice)=> {
      Session.set('device_id', discoveredDevice.id)
    })
    .catch((err)=>console.warn('button1 error caught', err))
  },
  'click #button2'(event, instance) {
    let deviceId = Session.get('device_id')
    instance.counter.set(instance.counter.get() + 1);
    (new Promise((resolve, reject)=>ble.connect(deviceId, resolve, reject)))
    .then((discoveredDevice)=> {

      console.log('device connect', discoveredDevice)
      Session.set('services', discoveredDevice.services)
      Session.set('characteristics', discoveredDevice.characteristics)
    })
    .catch((err)=>console.warn('button2 error caught', err))
  },
  'click #button3'(event, instance) {
    let deviceId = Session.get('device_id')
    instance.counter.set(instance.counter.get() + 1);
    (new Promise((resolve, reject)=>ble.disconnect(deviceId, resolve, reject)))
    .then((discoveredDevice)=> {
      console.log('device disconnect', discoveredDevice)
    })
    .catch((err)=>console.warn('button3 error caught', err))
  },
  'click #button4'(event, instance) {

    let services = Session.get('services');
    let characteristics = Session.get('characteristics');
    let deviceId = Session.get('device_id');
    instance.counter.set(instance.counter.get() + 1);
    characteristics.map((characteristicObj, n)=> {
      let service_uuid = characteristicObj.service;
      let characteristic_uuid = characteristicObj.characteristic;
      let properties = characteristicObj.properties;
      if (properties.indexOf('Read') != -1) {
        console.log('read 1 ', service_uuid);
        console.log('read 2 ', service_uuid, characteristic_uuid, ' for ', deviceId);
        (new Promise((resolve, reject)=>Meteor.setTimeout(resolve, 500 * n)))
        .then(()=>new Promise((resolve, reject) => ble.read(deviceId, service_uuid, characteristic_uuid, resolve, reject)))
        .then((buffer)=> {
          var detail = String.fromCharCode.apply(null, new Uint8Array(buffer));
          console.log('device read characteristic ', n, ' - ', characteristic_uuid, ' : ', detail)
        })
        .catch((err)=>console.warn('button4 error caught', err, ' - for ', service_uuid, characteristic_uuid, ' device ', deviceId))
      }
    });
  },
  'click #button5'(event, instance) {
    let services = Session.get('services');
    let characteristics = Session.get('characteristics');
    let device_id = Session.get('device_id');
    let f_name = "startNotification";
    ble[f_name](device_id, pulseOx.service, pulseOx.measurement, cb.bind(null, f_name + "success"), cb.bind(null, f_name + "failure"));

    instance.counter.set(instance.counter.get() + 1);
  },
});
