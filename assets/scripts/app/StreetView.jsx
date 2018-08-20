/**
 * StreetView.jsx
 *
 * Renders the street view.
 *
 * @module StreetView
 */
import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { IntlProvider } from 'react-intl'
import StreetEditable from './StreetEditable'
import SkyBackground from './SkyBackground'
import ScrollIndicators from './ScrollIndicators'
import Building from '../segments/Building'
import SegmentDragGuides from '../segments/SegmentDragGuides'
import EmptySegmentContainer from '../segments/EmptySegmentContainer'
import { infoBubble } from '../info_bubble/info_bubble'
import { animate, getElAbsolutePos } from '../util/helpers'
import { MAX_CUSTOM_STREET_WIDTH } from '../streets/width'
import { BUILDING_SPACE } from '../segments/buildings'
import { TILE_SIZE } from '../segments/constants'

class StreetView extends React.Component {
  static propTypes = {
    readOnly: PropTypes.bool,
    street: PropTypes.object.isRequired,
    system: PropTypes.object.isRequired,
    locale: PropTypes.object.isRequired
  }

  static defaultProps = {
    readOnly: false
  }

  constructor (props) {
    super(props)

    this.state = {
      isStreetScrolling: false,
      scrollPos: 0,
      posLeft: 0,
      posRight: 0,

      streetSectionSkyTop: 0,
      scrollTop: 0,
      skyTop: 0,

      onResized: false,
      buildingWidth: 0
    }

    this.ignoreScrollEvents = false
  }

  componentDidUpdate (prevProps, prevState) {
    const { viewportWidth, viewportHeight } = this.props.system
    const { remainingWidth } = this.props.street

    if (prevProps.system.viewportWidth !== viewportWidth ||
        prevProps.system.viewportHeight !== viewportHeight ||
        prevProps.street.width !== this.props.street.width) {
      this.onResize()
    }

    if (prevState.onResized && !this.state.onResized) {
      this.updateScrollLeft()
    }

    if (prevProps.street.remainingWidth !== remainingWidth) {
      this.updateStreetCanvasMargin(prevProps.street.remainingWidth, remainingWidth)
    }
  }

  updateStreetCanvasMargin = (prevRemainingWidth, remainingWidth) => {
    let prevStreetMargin = (-prevRemainingWidth * TILE_SIZE / 2)
    let currStreetMargin = (-remainingWidth * TILE_SIZE / 2)

    prevStreetMargin = (prevStreetMargin > BUILDING_SPACE) ? prevStreetMargin : BUILDING_SPACE
    currStreetMargin = (currStreetMargin > BUILDING_SPACE) ? currStreetMargin : BUILDING_SPACE

    if (prevStreetMargin !== currStreetMargin) {
      this.streetSectionCanvas.style.marginLeft = currStreetMargin + 'px'
      this.streetSectionCanvas.style.marginRight = currStreetMargin + 'px'

      this.setState({ streetMargin: currStreetMargin })
      const delta = currStreetMargin - prevStreetMargin

      if (this.streetSectionOuter.scrollLeft === 0 && delta < 0) {
        this.streetSectionCanvas.style.left = Math.abs(delta) + 'px'
      } else {
        this.streetSectionCanvas.style.left = 0
      }

      this.updateScrollLeft(delta)
    }
  }

  updateScrollLeft = (delta) => {
    const streetWidth = this.props.street.width * TILE_SIZE
    const { viewportWidth } = this.props.system

    if (delta) {
      this.streetSectionOuter.scrollLeft += delta
    } else {
      const scrollLeft = (streetWidth + (BUILDING_SPACE * 2) - viewportWidth) / 2
      this.streetSectionOuter.scrollLeft = scrollLeft
    }

    this.ignoreScrollEvents = true
    this.calculateStreetIndicatorsPositions()
  }

  onResize = () => {
    const { viewportWidth, viewportHeight } = this.props.system

    let streetSectionTop
    let streetSectionHeight = this.streetSectionInner.offsetHeight

    if (viewportHeight - streetSectionHeight > 450) {
      streetSectionTop = ((viewportHeight - streetSectionHeight - 450) / 2) + 450 + 80
    } else {
      streetSectionTop = viewportHeight - streetSectionHeight + 70
    }

    if (this.props.readOnly) {
      streetSectionTop += 80
    }

    let streetSectionSkyTop = ((streetSectionTop * 0.8) - 255)
    let scrollTop = (streetSectionTop + streetSectionHeight)

    let skyTop = streetSectionTop
    if (skyTop < 0) {
      skyTop = 0
    }

    const streetWidth = this.props.street.width * TILE_SIZE
    let streetSectionCanvasLeft =
      ((viewportWidth - streetWidth) / 2) - BUILDING_SPACE
    if (streetSectionCanvasLeft < 0) {
      streetSectionCanvasLeft = 0
    }

    this.streetSectionCanvas.style.width = streetWidth + 'px'
    this.streetSectionCanvas.style.left = streetSectionCanvasLeft + 'px'
    this.streetSectionInner.style.top = streetSectionTop + 'px'

    this.setState({
      streetSectionSkyTop,
      scrollTop,
      skyTop,
      onResized: true
    })
  }

  handleStreetScroll = (event) => {
    infoBubble.suppress()
    if (this.ignoreScrollEvents) {
      this.ignoreScrollEvents = false
      return
    }

    const scrollPos = this.streetSectionOuter.scrollLeft
    this.calculateStreetIndicatorsPositions()

    this.setState({
      scrollPos: scrollPos
    })
  }

  calculateStreetIndicatorsPositions = () => {
    const el = this.streetSectionOuter
    let posLeft
    let posRight

    if (el.scrollWidth <= el.offsetWidth) {
      posLeft = 0
      posRight = 0
    } else {
      var left = el.scrollLeft / (el.scrollWidth - el.offsetWidth)

      // TODO const off max width street
      var posMax = Math.round(this.props.street.width / MAX_CUSTOM_STREET_WIDTH * 6)
      if (posMax < 2) {
        posMax = 2
      }

      posLeft = Math.round(posMax * left)
      if ((left > 0) && (posLeft === 0)) {
        posLeft = 1
      }
      if ((left < 1.0) && (posLeft === posMax)) {
        posLeft = posMax - 1
      }
      posRight = posMax - posLeft
    }

    this.setState({
      posLeft: posLeft,
      posRight: posRight
    })
  }

  scrollStreet = (left, far = false) => {
    const el = this.streetSectionOuter
    let newScrollLeft

    if (left) {
      if (far) {
        newScrollLeft = 0
      } else {
        newScrollLeft = el.scrollLeft - (el.offsetWidth * 0.5)
      }
    } else {
      if (far) {
        newScrollLeft = el.scrollWidth - el.offsetWidth
      } else {
        newScrollLeft = el.scrollLeft + (el.offsetWidth * 0.5)
      }
    }

    animate(el, { scrollLeft: newScrollLeft }, 300)
  }

  setBuildingWidth = (el) => {
    const pos = getElAbsolutePos(el)

    let width = pos[0] + 25
    if (width < 0) {
      width = 0
    }

    this.setState({
      buildingWidth: width,
      onResized: false
    })
  }

  updatePerspective = (el) => {
    if (!el) return

    const pos = getElAbsolutePos(el)
    const scrollPos = (this.streetSectionOuter && this.streetSectionOuter.scrollLeft) || this.state.scrollPos
    const perspective = -(pos[0] - scrollPos - (this.props.system.viewportWidth / 2))

    el.style.webkitPerspectiveOrigin = (perspective / 2) + 'px 50%'
    el.style.MozPerspectiveOrigin = (perspective / 2) + 'px 50%'
    el.style.perspectiveOrigin = (perspective / 2) + 'px 50%'
  }

  render () {
    const dirtMargin = (this.state.streetMargin > BUILDING_SPACE) ? (this.state.streetMargin + 25) : this.state.buildingWidth
    const dirtStyle = {
      marginLeft: (-dirtMargin) + 'px',
      marginRight: (-dirtMargin) + 'px'
    }

    return (
      <React.Fragment>
        <section
          id="street-section-outer"
          onScroll={this.handleStreetScroll}
          ref={(ref) => { this.streetSectionOuter = ref }}
        >
          <section id="street-section-inner" ref={(ref) => { this.streetSectionInner = ref }}>
            <section id="street-section-canvas" ref={(ref) => { this.streetSectionCanvas = ref }}>
              <Building
                position="left"
                buildingWidth={this.state.buildingWidth}
                updatePerspective={this.updatePerspective}
              />
              <Building
                position="right"
                buildingWidth={this.state.buildingWidth}
                updatePerspective={this.updatePerspective}
              />
              <StreetEditable
                onResized={this.state.onResized}
                setBuildingWidth={this.setBuildingWidth}
                updatePerspective={this.updatePerspective}
              />
              <IntlProvider
                locale={this.props.locale.locale}
                key={this.props.locale.locale}
                messages={this.props.locale.messages}
              >
                <React.Fragment>
                  <SegmentDragGuides />
                  <EmptySegmentContainer />
                </React.Fragment>
              </IntlProvider>
              <section id="street-section-dirt" style={dirtStyle} />
            </section>
          </section>
        </section>
        <SkyBackground
          scrollPos={this.state.scrollPos}
          stopStreetScroll={this.stopStreetScroll}
          streetSectionSkyTop={this.state.streetSectionSkyTop}
          skyTop={this.state.skyTop}
        />
        <ScrollIndicators
          posLeft={this.state.posLeft}
          posRight={this.state.posRight}
          scrollStreet={this.scrollStreet}
          scrollTop={this.state.scrollTop}
        />
      </React.Fragment>
    )
  }
}

function mapStateToProps (state) {
  return {
    readOnly: state.app.readOnly,
    street: state.street,
    system: state.system,
    locale: state.locale
  }
}

export default connect(mapStateToProps)(StreetView)
