package main

import (
	"flag"
    "embed"
    "encoding/json"
    "fmt"
    "io/ioutil"
    "log"
    "net/http"
    "os"
    "sort"
    "strconv"
    "strings"
    "github.com/gin-gonic/gin"
)

// ==================== Типы и константы ====================

type Booster uintptr
type FastConfig uintptr

const (
    Dtype_float32 = int32(0)
    Dtype_float64 = int32(1)

    Row_major    = int32(1)
    PredictNormal = int32(0)
)

// Объявляем функции C API, которые будем регистрировать через purego.
// Здесь параметры "const char *" для строки задаются как *byte.
var BoosterLoadModelFromString func(model_str *byte, out_num_iterations *int32, out *Booster) int
var BoosterPredictForMatSingleRowFastInit func(booster Booster, predict_type int32, start_iteration int32, num_iteration int32, data_type int32, ncol int32, parameter string, out_fastConfig *FastConfig) int
var BoosterPredictForMatSingleRowFast func(fastConfig FastConfig, data []float32, outlen *int64, out_result *float64) int

// ==================== Эмбед модели и библиотечных файлов ====================

//go:embed model.txt.0
var modelData []byte

// Эмбед библиотеки LightGBM. Файлы: lib_lightgbm.dll, lib_lightgbm.dylibarm, lib_lightgbm.dylibx86, lib_lightgbm.so
// Поместите нужный файл в корень проекта или в папку, как здесь:
// --go:embed lib_lightgbm
//var libFile []byte

var _ embed.FS

var cachedBooster Booster

// ==================== Структуры для работы с данными карт ====================

type Card struct {
    Id      string             `json:"id"`
    Classes []string           `json:"class"`
    Icons   map[string]float64 `json:"icons"`
    Type    int                `json:"type"`
    Color   int                `json:"color"`
    Elite   bool               `json:"elite"`
    Life    float64            `json:"life"`
    Move    float64            `json:"move"`
    Rarity  int                `json:"rarity"`
    Uniq    bool               `json:"uniq"`
    Cost    float64            `json:"cost"`
    Hit     []float64          `json:"hit"`
}

var (
    cardInfo        = make(map[int]Card)
    globalClasses   = []string{"Акванит","Аккениец","Ангел","Архаалит","Боевая_машина","Болото","Врата","Герой-воин","Герой-жрец","Герой-маг","Герой-разбойник","Гном","Город","Горы","Демон","Дитя_Кронга","Дракон","Дух","Инквизитор","Йордлинг","Ковен","Койар","Крысолюд","Лес","Линунг","Море","Нежить","Орк","Пират","Постройка","Пустыня","Река","Речная_дева","Слуа","Степь","Страж_леса","Тоа-Дан","Тролль","Элементаль","Эльф"}
    globalIcons     = []string{"ova", "ovz", "armor", "regen", "ovs", "stamina", "zoal", "zoz", "direct", "zoo", "zor", "zom", "zot", "zov"}
    globalTypes     = []int{0,1,2,3,4,5}
    predefinedCards = []int{40034, 40014, 20164, 30160, 30098, 30096, 30054, 40199, 40077}
    allFeatureNames []string
)

// ==================== Загрузка данных о картах ====================

func loadCardInfo(jsonPath string) error {
    file, err := os.Open(jsonPath)
    if err != nil {
        return fmt.Errorf("не удалось открыть файл %s: %v", jsonPath, err)
    }
    defer file.Close()

    data, err := ioutil.ReadAll(file)
    if err != nil {
        return fmt.Errorf("ошибка чтения файла: %v", err)
    }

    var cards []Card
    if err := json.Unmarshal(data, &cards); err != nil {
        return fmt.Errorf("ошибка парсинга JSON: %v", err)
    }

    for _, card := range cards {
        if _, err := strconv.Atoi(card.Id); err == nil {
            id, _ := strconv.Atoi(card.Id)
            cardInfo[id] = card
        }
    }
    log.Printf("Загружено карт: %d\n", len(cardInfo))
    return nil
}

// ==================== Сбор глобальных признаков ====================

func collectGlobalFeatures() {
    classesSet := make(map[string]struct{})
    //iconsSet := make(map[string]struct{})
    //typesSet := make(map[string]struct{})

    for _, card := range cardInfo {
        for _, cls := range card.Classes {
            trimmed := strings.ReplaceAll(strings.TrimSpace(cls), " ", "_")
            if trimmed != "" {
                classesSet[trimmed] = struct{}{}
            }
        }
        // for icon := range card.Icons {
        //     iconsSet[icon] = struct{}{}
        // }
        //typesSet[strconv.Itoa(card.Type)] = struct{}{}
    }

    //for cls := range classesSet {
    //    cleaned := strings.ReplaceAll(cls, " ", "_")
    //    globalClasses = append(globalClasses, cleaned)
    //}
    sort.Strings(globalClasses)

    // for icon := range iconsSet {
    //     globalIcons = append(globalIcons, icon)
    // }
    sort.Strings(globalIcons)

    // for t := range typesSet {
    //     globalTypes = append(globalTypes, t)
    // }
    sort.Ints(globalTypes)
}

// ==================== Формирование имен признаков ====================

func initFeatureNames() {
    baseFeatureNames := []string{
        "total_context",
        "context_color_1", "context_color_2", "context_color_4",
        "context_color_8", "context_color_16", "context_color_32",
        "context_elite",
    }
    for _, t := range globalTypes {
        baseFeatureNames = append(baseFeatureNames, fmt.Sprintf("context_type_%s_count", t))
    }

    contextExtraNames := []string{
        "total_options", "option_number", "option_color", "option_rarity",
        "option_elite", "option_type", "option_uniq",
    }
    contextAggNames := []string{"context_life_sum", "context_move_sum"}
    for _, cls := range globalClasses {
        contextAggNames = append(contextAggNames, fmt.Sprintf("context_total_%s_count", cls))
    }
    for _, icon := range globalIcons {
        contextAggNames = append(contextAggNames, fmt.Sprintf("context_total_%s_count", icon))
    }
    for _, card := range predefinedCards {
        contextAggNames = append(contextAggNames, fmt.Sprintf("context_card_%d_count", card))
    }

    optionNumericNames := []string{"cost", "life", "move", "hit_avg", "hit_min", "hit_max"}
    // var optionTypeNames []string
    // for _, t := range globalTypes {
    //     optionTypeNames = append(optionTypeNames, fmt.Sprintf("type_%s", t))
    // }
    var optionClassNames []string
    for _, cls := range globalClasses {
        optionClassNames = append(optionClassNames, fmt.Sprintf("option_class_%s", cls))
    }
    var optionIconNames []string
    for _, icon := range globalIcons {
        optionIconNames = append(optionIconNames, fmt.Sprintf("option_icon_%s", icon))
    }

    allFeatureNames = append([]string{}, baseFeatureNames...)
    allFeatureNames = append(allFeatureNames, contextAggNames...)
    allFeatureNames = append(allFeatureNames, contextExtraNames...)
    allFeatureNames = append(allFeatureNames, optionNumericNames...)
    allFeatureNames = append(allFeatureNames, optionClassNames...)
    allFeatureNames = append(allFeatureNames, optionIconNames...)
    //allFeatureNames = append(allFeatureNames, optionTypeNames...)
}

// ==================== Извлечение признаков ====================

func extractFeatures(context []int, option int, options []int) []float64 {
    // Признаки для контекста
    totalContext := float64(len(context))
    contextColors := map[int]float64{1: 0, 2: 0, 4: 0, 8: 0, 16: 0, 32: 0}
    var contextElite float64 = 0
    contextTypeCounts := make(map[int]float64)
    for _, t := range globalTypes {
        contextTypeCounts[t] = 0
    }
    var lifeSum, moveSum float64 = 0, 0
    contextClassCounts := make(map[string]float64)
    for _, cls := range globalClasses {
        contextClassCounts[cls] = 0
    }
    contextIconCounts := make(map[string]float64)
    for _, icon := range globalIcons {
        contextIconCounts[icon] = 0
    }
    contextPredefCounts := make(map[int]float64)
    for _, card := range predefinedCards {
        contextPredefCounts[card] = 0
    }

    for _, cid := range context {
        card, ok := cardInfo[cid]
        if !ok {
            continue
        }
        if _, exists := contextColors[card.Color]; exists {
            contextColors[card.Color]++
        }
        if card.Elite {
            contextElite++
        }
        //ctype := strconv.Itoa(card.Type)
        if _, exists := contextTypeCounts[card.Type]; exists {
            contextTypeCounts[card.Type]++
        }
        lifeSum += card.Life
        moveSum += card.Move
        for _, cls := range card.Classes {
            trimmed := strings.ReplaceAll(strings.TrimSpace(cls), " ", "_")
            if trimmed != "" {
                if _, exists := contextClassCounts[trimmed]; exists {
                    contextClassCounts[trimmed]++
                }
            }
        }
        for _, icon := range globalIcons {
            if val, exists := card.Icons[icon]; exists && val != 0 {
                contextIconCounts[icon]++
            }
        }
        if _, exists := contextPredefCounts[cid]; exists {
            contextPredefCounts[cid]++
        }
    }

    baseContextFeatures := []float64{
        totalContext,
        contextColors[1], contextColors[2], contextColors[4],
        contextColors[8], contextColors[16], contextColors[32],
        contextElite,
    }
    var typeFeatures []float64
    for _, t := range globalTypes {
        typeFeatures = append(typeFeatures, contextTypeCounts[t])
    }
    contextAggFeatures := []float64{lifeSum, moveSum}
    var contextClassFeatures []float64
    for _, cls := range globalClasses {
        contextClassFeatures = append(contextClassFeatures, contextClassCounts[cls])
    }
    var contextIconFeatures []float64
    for _, icon := range globalIcons {
        contextIconFeatures = append(contextIconFeatures, contextIconCounts[icon])
    }
    var contextPredefFeatures []float64
    for _, card := range predefinedCards {
        contextPredefFeatures = append(contextPredefFeatures, contextPredefCounts[card])
    }
    contextFeatures := append([]float64{}, baseContextFeatures...)
    contextFeatures = append(contextFeatures, typeFeatures...)
    contextFeatures = append(contextFeatures, contextAggFeatures...)
    contextFeatures = append(contextFeatures, contextClassFeatures...)
    contextFeatures = append(contextFeatures, contextIconFeatures...)
    contextFeatures = append(contextFeatures, contextPredefFeatures...)

    // Признаки для опции
    totalOptions := float64(len(options))
    optionCard, ok := cardInfo[option]
    optionNumber := float64(option % 1000)
    var optionColor, optionRarity, optionElite, optionType, optionUniq float64
    if ok {
        optionColor = float64(optionCard.Color)
        optionRarity = float64(optionCard.Rarity)
        if optionCard.Elite {
            optionElite = 1
        } else {
            optionElite = 0
        }
        optionType = float64(optionCard.Type)
        if optionCard.Uniq {
            optionUniq = 1
        } else {
            optionUniq = 0
        }
    } else {
        optionColor, optionRarity, optionElite, optionType, optionUniq = 0, 0, 0, 0, 0
    }
    baseOptionFeatures := []float64{
        totalOptions, optionNumber, optionColor, optionRarity, optionElite, optionType, optionUniq,
    }

    optionClassFeatures := make([]float64, len(globalClasses))
    if ok {
        for _, cls := range optionCard.Classes {
            trimmed := strings.ReplaceAll(strings.TrimSpace(cls), " ", "_")
            for i, globalCls := range globalClasses {
                if trimmed == globalCls {
                    optionClassFeatures[i] = 1
                    break
                }
            }
        }
    }

    var optionIconFeatures []float64
    if ok {
        for _, icon := range globalIcons {
            if val, exists := optionCard.Icons[icon]; exists {
                optionIconFeatures = append(optionIconFeatures, val)
            } else {
                optionIconFeatures = append(optionIconFeatures, 0)
            }
        }
    } else {
        for range globalIcons {
            optionIconFeatures = append(optionIconFeatures, 0)
        }
    }

    var optionCost, optionLife, optionMove, hitAvg, hitMin, hitMax float64
    if ok {
        optionCost = optionCard.Cost
        optionLife = optionCard.Life
        optionMove = optionCard.Move
        if len(optionCard.Hit) > 0 {
            sum := 0.0
            hitMin = optionCard.Hit[0]
            hitMax = optionCard.Hit[0]
            for _, h := range optionCard.Hit {
                sum += h
                if h < hitMin {
                    hitMin = h
                }
                if h > hitMax {
                    hitMax = h
                }
            }
            hitAvg = sum / float64(len(optionCard.Hit))
        }
    }
    optionNumericFeatures := []float64{optionCost, optionLife, optionMove, hitAvg, hitMin, hitMax}

    // optionTypeFeatures := make([]float64, len(globalTypes))
    // if ok {
    //     for i, t := range globalTypes {
    //         if optionCard.Type == t {
    //             optionTypeFeatures[i] = 1
    //             break
    //         }
    //     }
    // }

    features := append([]float64{}, contextFeatures...)
    features = append(features, baseOptionFeatures...)
    features = append(features, optionNumericFeatures...)
    features = append(features, optionClassFeatures...)
    features = append(features, optionIconFeatures...)
    //features = append(features, optionTypeFeatures...)

    return features
}

// ==================== HTTP API: структуры запроса и ответа ====================

type PickRequest struct {
    Context []string `json:"context"`
    Options []string `json:"options"`
}

type PickResponse struct {
    Predictions  map[string]float64 `json:"predictions"`
    ChosenOption string             `json:"chosen_option"`
    ChosenIndex  int                `json:"chosen_index"`
}

// ==================== Функция предсказания выбора карты с использованием fast API ====================

func predictChoice(deck []string, options []string) (PickResponse, error) {
    var deckInt []int
    for _, s := range deck {
        id, err := strconv.Atoi(s)
        if err != nil {
            return PickResponse{}, fmt.Errorf("ошибка преобразования id карты %s: %v", s, err)
        }
        deckInt = append(deckInt, id)
    }
    var optionsInt []int
    for _, s := range options {
        id, err := strconv.Atoi(s)
        if err != nil {
            return PickResponse{}, fmt.Errorf("ошибка преобразования id опции %s: %v", s, err)
        }
        optionsInt = append(optionsInt, id)
    }

    // Вычисляем признаки для каждой опции
    var featuresList [][]float64
    for _, opt := range optionsInt {
        feats := extractFeatures(deckInt, opt, optionsInt)
        featuresList = append(featuresList, feats)
    }
    if len(featuresList) == 0 {
        return PickResponse{}, fmt.Errorf("список опций пуст")
    }

    numRows := len(featuresList)
    // Предсказания будем получать по одной строке
    preds := make([]float64, numRows)

    // Для каждой строки признаков
    for i, row := range featuresList {
        // Конвертируем []float64 в []float32
        rowF32 := make([]float32, len(row))
        for j, v := range row {
            rowF32[j] = float32(v)
        }

        var outLen int64
        var outPred float64
        var fastConfig FastConfig

        // Инициализируем fast-конфигурацию для одной строки
        ret := BoosterPredictForMatSingleRowFastInit(
            cachedBooster,
            PredictNormal,
            0,            // start_iteration
            -1,           // num_iteration (-1 = лучшая итерация)
            Dtype_float32,
            int32(len(rowF32)),
            "",           // пустой параметр
            &fastConfig,
        )
        if ret != 0 {
            return PickResponse{}, fmt.Errorf("ошибка инициализации fast-конфигурации для строки %d: код %d", i, ret)
        }

        // Получаем предсказание для одной строки
        ret = BoosterPredictForMatSingleRowFast(
            fastConfig,
            rowF32,
            &outLen,
            &outPred,
        )
        if ret != 0 {
            return PickResponse{}, fmt.Errorf("ошибка быстрого предсказания для строки %d: код %d", i, ret)
        }

        preds[i] = outPred
    }

    // Находим индекс с максимальным значением предсказания
    bestIdx := 0
    bestVal := preds[0]
    for i, p := range preds {
        if p > bestVal {
            bestVal = p
            bestIdx = i
        }
    }
    chosenOption := options[bestIdx]
    predDict := make(map[string]float64)
    for i, opt := range options {
        predDict[opt] = preds[i]
    }

    return PickResponse{
        Predictions:  predDict,
        ChosenOption: chosenOption,
        ChosenIndex:  bestIdx,
    }, nil
}

// ==================== HTTP API: Основные структуры ====================

// ==================== Основная функция ====================

func main() {
    portFlag := flag.String("port", "21285", "Порт для запуска сервера")
    pathFlag := flag.String("path", "/predict", "Путь эндпоинта для предсказания")
    flag.Parse()

    log.Printf("Длина модели: %d", len(modelData))
    initLibs(&BoosterLoadModelFromString, &BoosterPredictForMatSingleRowFastInit, &BoosterPredictForMatSingleRowFast)

    // Загрузка данных о картах
    if err := loadCardInfo("data.json"); err != nil {
        log.Fatalf("Ошибка загрузки данных карт: %v", err)
    }
    collectGlobalFeatures()
    initFeatureNames()

    // Подготавливаем C-строку для модели (с завершающим нулевым байтом)
    var outIter int32
    var booster Booster
    ret := BoosterLoadModelFromString(&modelData[0], &outIter, &booster)
    if ret != 0 {
        log.Fatalf("Не удалось загрузить модель, код ошибки: %d", ret)
    }
    cachedBooster = booster
    log.Printf("Модель загружена. Лучший итерация: %d", outIter)

    // Создание HTTP-сервера с использованием Gin
    gin.SetMode(gin.ReleaseMode)
    router := gin.Default()
    router.Use(func(c *gin.Context) {
        c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
        c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")
        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(http.StatusOK)
            return
        }
        c.Next()
    })

    router.POST(*pathFlag, func(c *gin.Context) {
        var req PickRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
            return
        }
        if len(req.Options) == 0 {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Список опций пуст"})
            return
        }
        resp, err := predictChoice(req.Context, req.Options)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
            return
        }
        c.JSON(http.StatusOK, resp)
    })

    log.Println("Запуск сервера на порту "+ *portFlag +"...")
    if err := router.Run(":" + *portFlag); err != nil {
        log.Fatalf("Ошибка запуска сервера: %v", err)
    }
}
