import gleam/int
import lustre
import lustre/attribute
import lustre/element
import lustre/element/html
import lustre/event

pub fn main() {
  let app = lustre.simple(init, update, view)
  let assert Ok(_) = lustre.start(app, "#app", Nil)

  Nil
}

fn init(_flags) -> Model {
  Model(0, Counter)
  // Start in counter mode
}

pub type Model {
  Model(
    count: Int,
    view_mode: ViewMode,
    // Add view state tracking
  )
}

pub type ViewMode {
  Counter
  Draft
}

pub type Msg {
  Increment
  IncrementTwo
  Decrement
  ToggleView
  // Add view toggle message
}

pub fn update(model: Model, msg: Msg) -> Model {
  case msg {
    ToggleView -> {
      let new_mode = case model.view_mode {
        Counter -> Draft
        Draft -> Counter
      }
      Model(..model, view_mode: new_mode)
    }
    // Keep existing increment/decrement logic
    Increment -> Model(..model, count: model.count + 1)
    Decrement -> Model(..model, count: model.count - 1)
    IncrementTwo -> Model(..model, count: model.count + 2)
  }
}

// pub fn view(model: Model) -> element.Element(Msg) {
//   let count = int.to_string(model)

//   html.div([attribute.class("min-h-screen w-full bg-header-dark")], [
//     html.header([attribute.class("p-4 bg-custom-dark text-white")], [
//       html.h1([attribute.class("w-full mx-auto max-w-screen-xl text-4xl font-bold")], [
//         html.text("Playoff Push")
//       ]),
//       html.h3([attribute.class("w-full mx-auto max-w-screen-xl mt-2 pl-2")], [
//         html.text("Fantasy Football for the NFL Playoffs")
//       ])
//     ]),
//     html.div([], [
//       html.button([attribute.class("btn-primary"), event.on_click(Increment)], [
//         element.text("+")
//       ]),
//       element.text(count),
//       html.button([attribute.class("btn-primary"), event.on_click(Decrement)], [
//         element.text("-")
//       ]),
//       html.button([attribute.class("btn-primary"), event.on_click(IncrementTwo)], [
//         element.text("+ two")
//       ])
//     ])
//   ])
// }

pub fn view(model: Model) -> element.Element(Msg) {
  let count = int.to_string(model.count)

  html.div([attribute.class("min-h-screen w-full bg-header-dark")], [
    html.header(
      [
        attribute.class(
          "p-4 bg-custom-dark text-white flex justify-around items-center",
        ),
      ],
      [ html.div([], [
          html.h1([attribute.class("text-4xl font-bold")], [
            html.text("Playoff Push"),
          ]),
          html.h3([attribute.class("font-bold pl-2")], [
            html.text("Experience Fantasy Football in the NFL Playoffs"),
          ]),
        ]),
        
        html.button(
          [event.on_click(ToggleView), attribute.class("btn-primary")],
          [element.text("Switch View")],
        ),
      ],
    ),
    

    case model.view_mode {
      Counter -> html.div([
        attribute.class("flex justify-center items-center h-full")
      ], [
        counter_view(count)
      ])
      Draft -> html.div([
        attribute.class("flex justify-center items-center h-full")
      ], [
        draft_view()
      ])
    }
  ])
}

fn counter_view(count: String) -> element.Element(Msg) {
  html.div([attribute.class("text-white p-4")], [
    html.button([attribute.class("btn-primary"), event.on_click(Increment)], [
      element.text("+"),
    ]),
    element.text(count),
    html.button([attribute.class("btn-primary"), event.on_click(Decrement)], [
      element.text("-"),
    ]),
    html.button([attribute.class("btn-primary"), event.on_click(IncrementTwo)], [
      element.text("+ two"),
    ]),
  ])
}

fn draft_view() -> element.Element(Msg) {
  html.div([attribute.class("p-4 text-white text-xl")], [
    element.text("Draft a Player"),
  ])
}
