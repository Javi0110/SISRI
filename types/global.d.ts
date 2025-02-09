import { Map } from 'ol'

declare global {
  interface Window {
    mapInstance?: Map
  }
}

export {} 