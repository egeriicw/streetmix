import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

export class PaletteTooltips extends React.Component {
  static propTypes = {
    label: PropTypes.string,
    visible: PropTypes.bool,
    pointAt: PropTypes.shape({
      x: PropTypes.number,
      y: PropTypes.number // Not used right now
    }),

    // Provided by Redux state
    isDragging: PropTypes.bool
  }

  static defaultProps = {
    label: null,
    visible: false
  }

  constructor (props) {
    super(props)

    this.el = React.createRef()
  }

  componentDidUpdate () {
    // pointAt.y is not used right now. we are just hardcoding its
    // vertical position inside the CSS for this component.
    this.el.current.style.left = this.props.pointAt.x - (this.el.current.getBoundingClientRect().width / 2) + 'px'
  }

  render () {
    const classNames = ['palette-tooltip']

    if (this.props.visible && !this.props.isDragging) {
      classNames.push('palette-tooltip-show')
    }

    return (
      <div className="palette-tooltip-container">
        <div className={classNames.join(' ')} ref={this.el}>
          <div className="palette-tooltip-contents">
            {this.props.label}
          </div>
          <div className="palette-tooltip-pointer-container">
            <div className="palette-tooltip-pointer" />
          </div>
        </div>
      </div>
    )
  }
}

function mapStateToProps (state) {
  return {
    isDragging: !!state.ui.draggingState // Coerce to boolean
  }
}

export default connect(mapStateToProps)(PaletteTooltips)
