import { FABRuntime } from '@fab/core'
import { TsExampleMetadata } from './types'

export default function TypescriptExampleRuntime({
  Router,
  Metadata,
}: FABRuntime<TsExampleMetadata>) {
  const metadata = Metadata.ts_test

  Router.onAll(async () => {
    return new Response(
      ` The time is ${metadata.what_time_is_it}!
        But we could have also gotten that from ${metadata.args.the_time_is} ooh!`,
      {
        status: 200,
      }
    )
  })
}
