// This file is part of Vidyamantra - http:www.vidyamantra.com/
/** @Copyright 2014  Vidya Mantra EduSystems Pvt. Ltd.
 * @author  Suman Bogati <http://www.vidyamantra.com>
 */
(function (window) {
  // var vcan = window.vcan;
  function Virtualbox(id) {
    const { vcan } = virtualclass.wb[id];
    vcan.virtual_box = {
      /**
       * Helper method to determine how many cross points are between the 4 image edges
       * and the horizontal line determined by the position of our mouse when clicked on canvas
       * @method findCrossPoints
       * @param ex {Number} x coordinate of the mouse
       * @param ey {Number} y coordinate of the mouse
       * @param oCoords {Object} Coordinates of the image being evaluated
       */
      findCrossPoints(ex, ey, oCoords) {
        let b1; let b2; let a1; let a2; let xi; let yi;
        let xcount = 0;
        let iLine;

        for (const lineKey in oCoords) {
          iLine = oCoords[lineKey];
          // optimisation 1: line below dot. no cross
          if ((iLine.o.y < ey) && (iLine.d.y < ey)) {
            continue;
          }
          // optimisation 2: line above dot. no cross
          if ((iLine.o.y >= ey) && (iLine.d.y >= ey)) {
            continue;
          }
          // optimisation 3: vertical line case
          if ((iLine.o.x == iLine.d.x) && (iLine.o.x >= ex)) {
            xi = iLine.o.x;
            yi = ey;
          }

          // calculate the intersection point
          else {
            b1 = 0;
            b2 = (iLine.d.y - iLine.o.y) / (iLine.d.x - iLine.o.x);
            a1 = ey - b1 * ex;
            a2 = iLine.o.y - b2 * iLine.o.x;

            xi = -(a1 - a2) / (b1 - b2);
            yi = a1 + b1 * xi;
          }
          // dont count xi < ex cases
          if (xi >= ex) {
            xcount += 1;
          }
          // optimisation 4: specific for square images
          if (xcount == 2) {
            break;
          }
        }
        return xcount;
      },
      /**
       * Method that returns an object with the 4 image lines in it given the coordinates of the corners
       * @method getImageLines
       * @param oCoords {Object} coordinates of the image corners
       */
      // TODO the i is not using here we can remove it
      getImageLines(oCoords, i) {
        return {
          topline: {
            o: oCoords.tl,
            d: oCoords.tr,
          },
          rightline: {
            o: oCoords.tr,
            d: oCoords.br,
          },
          bottomline: {
            o: oCoords.br,
            d: oCoords.bl,
          },
          leftline: {
            o: oCoords.bl,
            d: oCoords.tl,
          },
        };
      },
      /**
       * Applies one implementation of 'point inside polygon' algorithm
       * @method containsPoint
       * @param e { Event } event object
       * @param target { vcan.Object } object to test against
       * @return {Boolean} true if point contains within area of given object
       */

      containsPoint(e, target, wId) {
        const pointer = vcan.utility.getReltivePoint(e, wId);
        const { x } = pointer;
        const { y } = pointer;

        // http://www.geog.ubc.ca/courses/klink/gis.notes/ncgia/u32.html
        // http://idav.ucdavis.edu/~okreylos/TAship/Spring2000/PointInPolygon.html

        // we iterate through each object. If target found, return it.
        const iLines = vcan.virtual_box.getImageLines(target.oCoords);
        const xpoints = vcan.virtual_box.findCrossPoints(x, y, iLines);

        const canId = vcan.main.canvas.id;
        if ((xpoints && xpoints % 2 === 1) || target.findTargetCorner(e, wId)) {
          return true;
        }
        return false;
      },
    };
  }

  window.Virtualbox = Virtualbox;
}(window));
