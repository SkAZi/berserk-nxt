//go:build darwin
// +build darwin

package main

import (
	"github.com/ebitengine/purego"
	"log"
)

func initLibs(loadModel *func(model_str *byte, out_num_iterations *int32, out *Booster) int, predictInit *func(booster Booster, predict_type int32, start_iteration int32, num_iteration int32, data_type int32, ncol int32, parameter string, out_fastConfig *FastConfig) int, predictFast *func(fastConfig FastConfig, data []float32, outlen *int64, out_result *float64) int) {
    libHandle, err := purego.Dlopen("lib_lightgbm.dylib", purego.RTLD_NOW|purego.RTLD_GLOBAL)
    if err != nil {
        log.Fatalf("Ошибка загрузки библиотеки: %v", err)
    }

    purego.RegisterLibFunc(loadModel, libHandle, "LGBM_BoosterLoadModelFromString")
    purego.RegisterLibFunc(predictInit, libHandle, "LGBM_BoosterPredictForMatSingleRowFastInit")
    purego.RegisterLibFunc(predictFast, libHandle, "LGBM_BoosterPredictForMatSingleRowFast")
}
