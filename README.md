## Broviki

![broviki-removebg-preview](https://github.com/user-attachments/assets/2e52e226-c5fc-4d04-9b19-40b06cc15d53)

This ia a demo project that allows you to manage video cameras 
and demonstrates the possibilities of the Onvif library version 1.
https://github.com/agsh/onvif/tree/v1

```shell
git clone https://github.com/agsh/broviki.git
cd broviki
npm install
npm run dev
```

Open in browser [http://localhost:3000](http://localhost:3000)

### Things that work:
- Add a new camera (hostname, port, username, password, useSecure, useWSSecurity, path)
- Add cameras from the SOAP-Discovery
- Remove a camera
- Select a camera
- Change camera settings
- Connect to a camera and get capabilities
- Get a camera snapshot

### Things that don't work yet:
- Everything else
