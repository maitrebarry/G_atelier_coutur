import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import QRCode from 'qrcode-generator';

export default function QRCodeMatrix({value, size = 132}) {
  const matrix = useMemo(() => {
    const qr = QRCode(0, 'M');
    qr.addData(value || '');
    qr.make();
    const count = qr.getModuleCount();
    const cells = [];
    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        if (qr.isDark(row, col)) cells.push({row, col});
      }
    }
    return {count, cells};
  }, [value]);

  const cellSize = size / matrix.count;

  return (
    <View style={[styles.box, {width: size, height: size}]}>
      {matrix.cells.map(cell => (
        <View
          key={`${cell.row}-${cell.col}`}
          style={[
            styles.cell,
            {
              width: cellSize,
              height: cellSize,
              left: cell.col * cellSize,
              top: cell.row * cellSize,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {backgroundColor: '#fff', position: 'relative'},
  cell: {position: 'absolute', backgroundColor: '#111'},
});
