#!/bin/sh
# wipes exported files between runs, e.g. OUT_DIR=out sh scripts/clean.sh
# stops with an error when OUT_DIR is not set, so it never runs on /
rm -rf "${OUT_DIR:?set OUT_DIR to the folder to wipe}"/*
