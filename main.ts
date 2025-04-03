import {OBSRequestTypes, OBSWebSocket} from "npm:obs-websocket-js"
import { obs } from "./private_config.ts";

const obsClient = new OBSWebSocket();

await obsClient.connect("ws://" + obs.ip + ":" + obs.port, obs.password)

const currentScene = await obsClient.call('GetCurrentProgramScene');

const get_item_id: OBSRequestTypes['GetSceneItemId'] = {
  sourceName: obs.scene_name,
  sceneUuid: currentScene.sceneUuid
}

const {sceneItemId} = await obsClient.call('GetSceneItemId',get_item_id);

const get_item_transform: OBSRequestTypes['GetSceneItemTransform'] = {
  sceneItemId,
  sceneUuid: currentScene.sceneUuid
}

type SceneItemTransform = {
  alignment: number,                                                                                                         
  boundsAlignment: number,                                                                                                   
  boundsHeight: number,                                                                                                      
  boundsType: "OBS_BOUNDS_NONE",
  boundsWidth: number,
  cropBottom: number,
  cropLeft: number,
  cropRight: number,
  cropToBounds: false,
  cropTop: number,
  height: number,
  positionX: number,
  positionY: number,
  rotation: number,
  scaleX: number,
  scaleY: number,
  sourceHeight: number,
  sourceWidth: number,
  width: number
}

const {sceneItemTransform} = await obsClient.call('GetSceneItemTransform', get_item_transform);

let transform: SceneItemTransform = sceneItemTransform as SceneItemTransform;

export async function reset() {
  transform.rotation = 0;
  transform.scaleX = 1;
  transform.scaleY = 1;
  transform.alignment = 0;

  const req: OBSRequestTypes['SetSceneItemTransform'] = {
    sceneItemId,
    sceneUuid: currentScene.sceneUuid,
    sceneItemTransform: {
      rotation: transform.rotation,
      scaleX: transform.scaleX,
      scaleY: transform.scaleY,
      alignment: 0
    }
  };

  await obsClient.call('SetSceneItemTransform', req);
}

export async function rotate(unit: number) {
  transform.rotation = (transform.rotation + unit) % 360;
  const rectangle = rotate_by_angle(degreeToRadians(transform.rotation));

  const w = 960, h = 540;

  const r = {
    top_left:    [Math.abs(rectangle.top_left[0] / w), Math.abs(rectangle.top_left[1] / h)],
    top_right:   [Math.abs(rectangle.top_right[0] / w), Math.abs(rectangle.top_right[1] / h)],
    bottom_left: [Math.abs(rectangle.bottom_left[0] / w), Math.abs(rectangle.bottom_left[1] / h)],
    bottom_right:[Math.abs(rectangle.bottom_right[0] / w), Math.abs(rectangle.bottom_right[1] / h)]
  }

  const x_max = Math.max(r.top_left[0], r.top_right[0], r.bottom_left[0], r.bottom_right[0]);
  const y_max = Math.max(r.top_left[1], r.top_right[1], r.bottom_left[1], r.bottom_right[1]);

  const max = Math.max(x_max, y_max);

  console.log(max);


  
  const req: OBSRequestTypes['SetSceneItemTransform'] = {
    sceneItemId,
    sceneUuid: currentScene.sceneUuid,
    sceneItemTransform: {
      rotation: transform.rotation,
      scaleX: 1 / max,
      scaleY: 1 / max,
    }
  };

  await obsClient.call('SetSceneItemTransform', req);




  transform = sceneItemTransform as SceneItemTransform;
}



// /* 0, 0, 1920, 1080 => rotate thanks to the angle => calculate the cosine and sine functions and
// DO something cool !!


//   0,0 --------------------- 1920,0
//       |                   |
//       |                   |
//       |                   |
//       ---------------------
//   0,1080                    1920, 1080


//  yvelocity += gravity  

// */


const rect = {
  top_left: [-960, -540], 
  top_right: [960, -540], 
  bottom_left: [-960, 540], 
  bottom_right: [960, 540]
}

function rotate_by_angle(angle: number) {
  return {
    top_left: [
      rect.top_left[0] * Math.cos(angle) - rect.top_left[1] * Math.sin(angle),
      rect.top_left[0] * Math.sin(angle) + rect.top_left[1] * Math.cos(angle),
    ], 
    top_right: [
      rect.top_right[0] * Math.cos(angle) - rect.top_right[1] * Math.sin(angle),
      rect.top_right[0] * Math.sin(angle) + rect.top_right[1] * Math.cos(angle),
    ], 
    bottom_left: [
      rect.bottom_left[0] * Math.cos(angle) - rect.bottom_left[1] * Math.sin(angle),
      rect.bottom_left[0] * Math.sin(angle) + rect.bottom_left[1] * Math.cos(angle),
    ], 
    bottom_right: [
      rect.bottom_right[0] * Math.cos(angle) - rect.bottom_right[1] * Math.sin(angle),
      rect.bottom_right[0] * Math.sin(angle) + rect.bottom_right[1] * Math.cos(angle),
    ]
  }
}


function degreeToRadians(degrees: number) {
  return (degrees) * Math.PI / 180.0;
}
