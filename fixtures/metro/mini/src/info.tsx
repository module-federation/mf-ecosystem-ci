import {VERSION} from 'lodash';
import {Text, View} from 'react-native';

export default function Info({label = 'mini'}: {label?: string}) {
  return (
    <View testID="mini-info">
      <Text>{`MF_FIXTURE_MINI_INFO ${label} lodash@${VERSION}`}</Text>
    </View>
  );
}
