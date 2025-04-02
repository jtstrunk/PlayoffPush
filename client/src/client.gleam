import gleam/int
import gleam/io
import gleam/list
import lustre
import lustre/attribute
import lustre/element
import lustre/element/html
import lustre/event
import lustre/server_component

pub fn main() {
  let app = lustre.simple(init, update, view)
  let assert Ok(_) = lustre.start(app, "#app", Nil)

  Nil
}

fn init(_flags) -> Model {
  Model
}

pub type Model {
  Model
}

pub type Msg {
  Msg
}

pub fn update(model: Model, msg: Msg) -> Model {
  model
}

pub fn view(model: Model) -> element.Element(Msg) {
  html.div([], [
    server_component.script(),
    element.element(
      "lustre-server-component",
      [server_component.route("/draft-server-component")],
      [],
    ),
  ])
}
