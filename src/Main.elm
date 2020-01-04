module Main exposing (main)

import Browser
import Browser.Events
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Task
import Time


type alias Model =
    { animationType : Animation
    , animationLength : Int
    , animationQuantity : Int
    , posix : Time.Posix
    , previousPosix : Time.Posix
    , counter : Int
    , fpsHistory : List Int
    , showFps : Bool
    }


type Animation
    = AnimationNone
    | AnimationKeyframesLong
    | AnimationKeyframesShort
    | AnimationOnAnimationFrame Time.Posix
    | AnimationOnAnimationFrameInStyle Time.Posix


animationToString : Animation -> String
animationToString animation =
    case animation of
        AnimationNone ->
            "None"

        AnimationKeyframesLong ->
            "KeyframesLong"

        AnimationKeyframesShort ->
            "KeyframesShort"

        AnimationOnAnimationFrame _ ->
            "OnAnimationFrame"

        AnimationOnAnimationFrameInStyle _ ->
            "OnAnimationFrameInStyle"


initialModel : ( Model, Cmd msg )
initialModel =
    ( { animationType = AnimationNone
      , animationLength = 2000
      , animationQuantity = 500
      , posix = Time.millisToPosix 0
      , previousPosix = Time.millisToPosix 0
      , counter = 0
      , fpsHistory = []
      , showFps = True
      }
    , Cmd.none
    )


type Msg
    = ChangeAnimation Animation
    | ChangeLength Int
    | ChangeQuantity Int
    | OnAnimationFrame Time.Posix
    | StartAnimationOnAnimationFrame Time.Posix
    | StartAnimationOnAnimationFrameInStyle Time.Posix
    | ToggleFps


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        ChangeAnimation newType ->
            case newType of
                AnimationOnAnimationFrame _ ->
                    ( model, Task.perform StartAnimationOnAnimationFrame Time.now )

                AnimationOnAnimationFrameInStyle _ ->
                    ( model, Task.perform StartAnimationOnAnimationFrameInStyle Time.now )

                _ ->
                    ( { model | animationType = newType }, Cmd.none )

        ChangeLength newLength ->
            ( { model | animationLength = newLength }, Cmd.none )

        ChangeQuantity newQuantity ->
            ( { model | animationQuantity = newQuantity }, Cmd.none )

        OnAnimationFrame posix ->
            if model.showFps then
                let
                    fpsHistory =
                        if modBy 10 model.counter == 0 then
                            let
                                fpsCurrent =
                                    1 / (toFloat (Time.posixToMillis model.posix - Time.posixToMillis model.previousPosix) / 1000)
                            in
                            round fpsCurrent :: model.fpsHistory

                        else
                            model.fpsHistory
                in
                ( { model
                    | posix = posix
                    , previousPosix = model.posix
                    , counter = model.counter + 1
                    , fpsHistory = fpsHistory
                  }
                , Cmd.none
                )

            else
                ( { model | posix = posix }, Cmd.none )

        StartAnimationOnAnimationFrame posix ->
            ( { model | animationType = AnimationOnAnimationFrame posix }, Cmd.none )

        StartAnimationOnAnimationFrameInStyle posix ->
            ( { model | animationType = AnimationOnAnimationFrameInStyle posix }, Cmd.none )

        ToggleFps ->
            ( { model | showFps = not model.showFps }, Cmd.none )


attrs : List (Attribute msg)
attrs =
    []


animationNone : Model -> Html msg
animationNone model =
    span attrs
        [ text "O" ]


animationKeyframesShort : Model -> Html msg
animationKeyframesShort model =
    span
        (attrs
            ++ [ style "animation" (String.fromInt model.animationLength ++ "ms linear 0ms infinite normal both running keyframesShort")
               ]
        )
        [ text "O" ]


animationKeyframesLong : Model -> Html msg
animationKeyframesLong model =
    span
        (attrs
            ++ [ style "animation" (String.fromInt model.animationLength ++ "ms linear 0ms infinite normal both running keyframesLong")
               ]
        )
        [ text "O" ]


animationOnAnimationFrame : Model -> Time.Posix -> Html msg
animationOnAnimationFrame model posixStarted =
    let
        pointInTimeNotNormilized =
            modBy model.animationLength <| Time.posixToMillis model.posix - Time.posixToMillis posixStarted

        pointInTime =
            toFloat pointInTimeNotNormilized / toFloat model.animationLength

        transofrmations =
            fn pointInTime { opacity = 0, x = 0, y = 200 }
    in
    span
        (attrs
            ++ List.map (\( key, value ) -> style key value) transofrmations
        )
        [ text "O" ]


animationOnAnimationFrameInStyle : Model -> Html msg
animationOnAnimationFrameInStyle model =
    span
        (attrs
            ++ [ class "animationFrameInStyle" ]
        )
        [ text "O" ]


view : Model -> Html Msg
view model =
    div [ style "margin" "20px" ]
        [ node "style" [] [ text <| css model ]
        , case model.animationType of
            AnimationOnAnimationFrameInStyle posixStarted ->
                let
                    pointInTimeNotNormilized =
                        modBy model.animationLength <| Time.posixToMillis model.posix - Time.posixToMillis posixStarted

                    pointInTime =
                        toFloat pointInTimeNotNormilized / toFloat model.animationLength
                in
                node "style" [] [ text <| ".animationFrameInStyle {" ++ (fnToString <| fn pointInTime { opacity = 0, x = 0, y = 200 }) ++ "}" ]

            _ ->
                node "style" [] [ text <| "" ]
        , if model.showFps then
            div []
                [ text <| String.fromInt <| Maybe.withDefault 0 <| List.head model.fpsHistory
                , text " FPS"
                ]

          else
            text ""
        , if model.showFps then
            div [] <|
                List.map
                    (\y ->
                        div
                            [ class "fps"
                            , style "height" (String.fromInt (Basics.min 70 y) ++ "px")
                            ]
                            [ text "" ]
                    )
                    (List.take 100 model.fpsHistory)

          else
            text ""
        , div [] [ button [ onClick <| ToggleFps ] [ text "Toggle FPS" ] ]
        , div []
            [ text "Type "
            , button [ onClick <| ChangeAnimation <| AnimationNone ] [ text "None" ]
            , button [ onClick <| ChangeAnimation <| AnimationKeyframesLong ] [ text "KeyframesLong" ]
            , button [ onClick <| ChangeAnimation <| AnimationKeyframesShort ] [ text "KeyframesShort" ]
            , button [ onClick <| ChangeAnimation <| AnimationOnAnimationFrame <| Time.millisToPosix 0 ] [ text "OnAnimationFrame" ]
            , button [ onClick <| ChangeAnimation <| AnimationOnAnimationFrameInStyle <| Time.millisToPosix 0 ] [ text "OnAnimationFrameInStyle" ]
            , text " "
            , text <| animationToString model.animationType
            ]
        , div []
            [ text "Length "
            , button [ onClick <| ChangeLength 200 ] [ text "200" ]
            , button [ onClick <| ChangeLength 2000 ] [ text "2000" ]
            , button [ onClick <| ChangeLength 5000 ] [ text "5000" ]
            , button [ onClick <| ChangeLength 10000 ] [ text "10000" ]
            , text " "
            , text <| String.fromInt model.animationLength
            ]
        , div []
            [ text "Quantity "
            , button [ onClick <| ChangeQuantity 1 ] [ text "1" ]
            , button [ onClick <| ChangeQuantity 20 ] [ text "20" ]
            , button [ onClick <| ChangeQuantity 200 ] [ text "200" ]
            , button [ onClick <| ChangeQuantity 500 ] [ text "500" ]
            , button [ onClick <| ChangeQuantity 1000 ] [ text "1000" ]
            , text " "
            , text <| String.fromInt model.animationQuantity
            ]
        , div [] <|
            List.repeat model.animationQuantity <|
                case model.animationType of
                    AnimationNone ->
                        animationNone model

                    AnimationKeyframesLong ->
                        animationKeyframesLong model

                    AnimationKeyframesShort ->
                        animationKeyframesShort model

                    AnimationOnAnimationFrame posixStarted ->
                        animationOnAnimationFrame model posixStarted

                    AnimationOnAnimationFrameInStyle _ ->
                        animationOnAnimationFrameInStyle model
        ]


subscriptions : Model -> Sub Msg
subscriptions model =
    if model.showFps then
        Browser.Events.onAnimationFrame OnAnimationFrame

    else
        case model.animationType of
            AnimationOnAnimationFrame _ ->
                Browser.Events.onAnimationFrame OnAnimationFrame

            AnimationOnAnimationFrameInStyle _ ->
                Browser.Events.onAnimationFrame OnAnimationFrame

            _ ->
                Sub.none


timePerFrame : Float
timePerFrame =
    -- 16.66666666667
    1000 / 60


cubicOut : Float -> Float
cubicOut t =
    let
        f =
            t - 1.0
    in
    f * f * f + 1.0


recursionStep : Float -> Float -> Fly -> String
recursionStep pointInTime b fly =
    let
        t =
            pointInTime + (b - pointInTime) * cubicOut pointInTime
    in
    String.join "" [ String.fromFloat (pointInTime * 100), "%{", fnToString <| fn t fly, "}" ]


fn : Float -> Fly -> List ( String, String )
fn pointInTime fly =
    let
        u =
            1 - pointInTime

        -- transform should have present transform
        -- in JS:
        -- const style = getComputedStyle(node);
        -- const transform = style.transform === 'none' ? '' : style.transform;
        transform =
            ""

        -- target_opacity should have present opacity
        -- in JS:
        -- const style = getComputedStyle(node);
        -- const target_opacity = +style.opacity;
        target_opacity =
            1

        od =
            target_opacity * (1 - fly.opacity)
    in
    [ ( "transform"
      , String.join ""
            [ "translate("
            , String.fromFloat <| u * fly.x
            , "px, "
            , String.fromFloat <| u * fly.y
            , "px)"
            ]
      )
    , ( "opacity", String.fromFloat <| target_opacity - u * od )
    ]


fnToString : List ( String, String ) -> String
fnToString fnResult =
    String.join "\n" <| List.map (\( key, value ) -> key ++ ": " ++ value ++ ";") fnResult


recursion : { acc : List String, fly : Fly, pointInTime : Float, stepSize : Float } -> List String
recursion { pointInTime, stepSize, acc, fly } =
    let
        b =
            -- 0 = outro, 1 = intro
            1

        r t =
            recursionStep t b fly :: acc
    in
    if pointInTime + stepSize <= 1 then
        recursion
            { pointInTime = pointInTime + stepSize
            , stepSize = stepSize
            , acc = r pointInTime
            , fly = fly
            }

    else
        r 1


type alias Fly =
    { opacity : Float, x : Float, y : Float }


createRule : Int -> Fly -> String
createRule duration fly =
    let
        stepSize =
            timePerFrame / toFloat duration

        result =
            recursion
                { pointInTime = 0
                , stepSize = stepSize
                , acc = []
                , fly = fly
                }
    in
    String.join "\n, " (List.reverse result)


main : Program () Model Msg
main =
    Browser.element
        { init = \_ -> initialModel
        , view = view
        , update = update
        , subscriptions = subscriptions
        }


css : Model -> String
css model =
    """
.fps {
    width: 2px;
    display: inline-block;
    background-color: green;
}

button {
    margin: 5px;
    font-size: 16px;
}

span {
    display: inline-block;
    background-color: lightGreen;
}
@keyframes keyframesShort {
0%{
    transform:  translate(0px, 200px);
    opacity: 0}
100% {
    transform:  translate(0px, 0px);
    opacity: 1}
}

@keyframes keyframesLong
{ """ ++ createRule model.animationLength { x = 0, y = 200, opacity = 0 } ++ """
}
"""
