import { config } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'

config.global.plugins = [createTestingPinia({ stubActions: false })]
