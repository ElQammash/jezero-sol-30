#!/usr/bin/env bash
# Crop and compress gameplay screenshots (docs/screenshots) into deck images (docs/demo/img).
set -e
S=docs/screenshots; D=docs/demo/img; mkdir -p $D
c() { ffmpeg -loglevel error -y -i "$S/$1.png" -vf "$2" -q:v 3 "$D/$3.jpg"; }
c hero-colony "scale=1920:-1" hero
c hero-colony-2 "scale=1920:-1" hero2
c play-goal-arrows "scale=1920:-1" gameplay
c play-goal-arrows "crop=360:240:0:0,scale=540:360:flags=lanczos" clock
c play-goal-arrows "crop=660:440:800:55,scale=540:360:flags=lanczos" goal
c crew-working "crop=780:520:1110:250,scale=540:360:flags=lanczos" crew
c panels-dusty "crop=1750:420:160:240,scale=700:-1:flags=lanczos" dusty
c panels-clean "crop=1750:420:160:240,scale=700:-1:flags=lanczos" clean
c panels-dusty "crop=340:90:1525:915,scale=510:-1:flags=lanczos" dusty-log
c panels-clean "crop=340:90:1525:915,scale=510:-1:flags=lanczos" clean-log
c source-button "crop=344:540:788:268,scale=516:810:flags=lanczos" source-panel
c source-button "scale=1920:-1" source
c crisis-card "scale=1920:-1" crisis
c storm-crisis "scale=1920:-1" storm
c crops-growing "scale=1920:-1" crops
c tutorial-pointer "scale=1920:-1" tutorial
echo "deck images ready"
