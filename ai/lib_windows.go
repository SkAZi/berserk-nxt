//go:build windows
// +build windows

package main

import (
    "log"
    "syscall"
    "unsafe"
)

// initLibs для Windows, без purego
func initLibs(loadModel *func(model_str *byte, out_num_iterations *int32, out *Booster) int, predictInit *func(booster Booster, predict_type int32, start_iteration int32, num_iteration int32, data_type int32, ncol int32, parameter string, out_fastConfig *FastConfig) int, predictFast *func(fastConfig FastConfig, data []float32, outlen *int64, out_result *float64) int) {
    // Загружаем DLL через syscall
    dll, err := syscall.LoadDLL("lib_lightgbm.dll")
    if err != nil {
        log.Fatalf("Ошибка загрузки DLL %s: %v", "lib_lightgbm.dll", err)
    }

    // Находим нужные процедуры
    procLoadModel, err := dll.FindProc("LGBM_BoosterLoadModelFromString")
    if err != nil {
        log.Fatalf("Не удалось найти LGBM_BoosterLoadModelFromString: %v", err)
    }
    procPredictInit, err := dll.FindProc("LGBM_BoosterPredictForMatSingleRowFastInit")
    if err != nil {
        log.Fatalf("Не удалось найти LGBM_BoosterPredictForMatSingleRowFastInit: %v", err)
    }
    procPredictFast, err := dll.FindProc("LGBM_BoosterPredictForMatSingleRowFast")
    if err != nil {
        log.Fatalf("Не удалось найти LGBM_BoosterPredictForMatSingleRowFast: %v", err)
    }

    // Создаём обёртки Go-функций, которые будут вызывать эти процедуры
    loadModelFunc := func(modelStr *byte, outNumIterations *int32, out *Booster) int {
        r, _, _ := procLoadModel.Call(
            uintptr(unsafe.Pointer(modelStr)),
            uintptr(unsafe.Pointer(outNumIterations)),
            uintptr(unsafe.Pointer(out)),
        )
        return int(r)
    }

    predictInitFunc := func(
        booster Booster,
        predictType int32,
        startIteration int32,
        numIteration int32,
        dataType int32,
        ncol int32,
        parameter string,
        outFastConfig *FastConfig,
    ) int {
        paramCStr, _ := syscall.BytePtrFromString(parameter)
        r, _, _ := procPredictInit.Call(
            uintptr(booster),
            uintptr(predictType),
            uintptr(startIteration),
            uintptr(numIteration),
            uintptr(dataType),
            uintptr(ncol),
            uintptr(unsafe.Pointer(paramCStr)),
            uintptr(unsafe.Pointer(outFastConfig)),
        )
        return int(r)
    }

    predictFastFunc := func(
        fastConfig FastConfig,
        data []float32,
        outLen *int64,
        outResult *float64,
    ) int {
        r, _, _ := procPredictFast.Call(
            uintptr(fastConfig),
            uintptr(unsafe.Pointer(&data[0])),
            uintptr(unsafe.Pointer(outLen)),
            uintptr(unsafe.Pointer(outResult)),
        )
        return int(r)
    }

    // Теперь записываем их в глобальные переменные, на которые указывают параметры initLibs
    *loadModel = loadModelFunc
    *predictInit = predictInitFunc
    *predictFast = predictFastFunc
}
